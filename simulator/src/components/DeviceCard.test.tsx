import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeviceCard } from './DeviceCard';
import * as deviceWrites from '../lib/deviceWrites';
import type { Device } from '../types';

vi.mock('../lib/deviceWrites');

describe('DeviceCard', () => {
  beforeEach(() => {
    vi.mocked(deviceWrites.updateDeviceStatus).mockResolvedValue(undefined);
  });

  const outlet: Device = { id: 'dev-1', type: 'outlet', name: 'TV Outlet', row: 0, col: 0, status: 'OFF' };

  it('renders the device name and current status', () => {
    render(<DeviceCard floorId="floor-1" device={outlet} />);
    expect(screen.getByText('TV Outlet')).toBeInTheDocument();
    expect(screen.getByText('OFF', { selector: 'p' })).toBeInTheDocument();
  });

  it('calls updateDeviceStatus with ON when the ON button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeviceCard floorId="floor-1" device={outlet} />);
    await user.click(screen.getByRole('button', { name: 'ON' }));
    expect(deviceWrites.updateDeviceStatus).toHaveBeenCalledWith('floor-1', 'dev-1', outlet, 'ON');
  });

  it('renders all four generic status buttons', () => {
    render(<DeviceCard floorId="floor-1" device={outlet} />);
    expect(screen.getByRole('button', { name: 'ON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OFF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ERROR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'DISCONNECTED' })).toBeInTheDocument();
  });

  it('shows schedule info read-only for a scheduled device', () => {
    const scheduled: Device = {
      ...outlet,
      id: 'dev-2',
      schedule: { startTime: '18:00', endTime: '23:00', enabled: true },
    };
    render(<DeviceCard floorId="floor-1" device={scheduled} />);
    expect(screen.getByText(/18:00/)).toBeInTheDocument();
    expect(screen.getByText(/23:00/)).toBeInTheDocument();
  });
});
