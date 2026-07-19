import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MultiSwitchControls } from './MultiSwitchControls';
import * as deviceWrites from '../lib/deviceWrites';
import type { Device } from '../types';

vi.mock('../lib/deviceWrites');

describe('MultiSwitchControls', () => {
  beforeEach(() => {
    vi.mocked(deviceWrites.toggleSwitch).mockResolvedValue(undefined);
  });

  const device: Device = {
    id: 'gang-1',
    type: 'multiswitch',
    name: 'Kitchen Gang Box',
    row: 0,
    col: 0,
    status: 'ON',
    switches: [
      { id: 'sw1', label: 'Ceiling Light', status: 'ON' },
      { id: 'sw2', label: 'Fan', status: 'OFF' },
    ],
  };

  it('renders one row per sub-switch with its label and status', () => {
    render(<MultiSwitchControls floorId="floor-1" device={device} />);
    expect(screen.getByText('Ceiling Light')).toBeInTheDocument();
    expect(screen.getByText('Fan')).toBeInTheDocument();
  });

  it('calls toggleSwitch with the clicked sub-switch id', async () => {
    const user = userEvent.setup();
    render(<MultiSwitchControls floorId="floor-1" device={device} />);
    await user.click(screen.getByRole('button', { name: /Fan/ }));
    expect(deviceWrites.toggleSwitch).toHaveBeenCalledWith('floor-1', 'gang-1', device.switches, 'sw2');
  });
});
