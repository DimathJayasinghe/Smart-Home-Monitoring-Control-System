import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraControls } from './CameraControls';
import * as deviceWrites from '../lib/deviceWrites';
import type { Device } from '../types';

vi.mock('../lib/deviceWrites');

describe('CameraControls', () => {
  beforeEach(() => {
    vi.mocked(deviceWrites.cycleSnapshot).mockResolvedValue(undefined);
  });

  const device: Device = {
    id: 'cam-1',
    type: 'camera',
    name: 'Front Door Camera',
    row: 0,
    col: 0,
    status: 'ON',
    snapshotUrls: ['a.jpg', 'b.jpg', 'c.jpg'],
    currentSnapshotIndex: 1,
  };

  it('renders the current snapshot url', () => {
    render(<CameraControls floorId="floor-1" device={device} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'b.jpg');
  });

  it('calls cycleSnapshot with the current index and total when clicked', async () => {
    const user = userEvent.setup();
    render(<CameraControls floorId="floor-1" device={device} />);
    await user.click(screen.getByRole('button', { name: /cycle snapshot/i }));
    expect(deviceWrites.cycleSnapshot).toHaveBeenCalledWith('floor-1', 'cam-1', 1, 3);
  });
});
