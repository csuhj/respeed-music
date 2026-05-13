import { formatDuration } from './format-duration';

describe('formatDuration', () => {
  it('formats zero as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats whole seconds below a minute', () => {
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(30)).toBe('0:30');
    expect(formatDuration(59)).toBe('0:59');
  });

  it('pads single-digit seconds with a leading zero', () => {
    expect(formatDuration(61)).toBe('1:01');
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats exact minute boundaries', () => {
    expect(formatDuration(60)).toBe('1:00');
    expect(formatDuration(120)).toBe('2:00');
  });

  it('formats longer durations correctly', () => {
    expect(formatDuration(3600)).toBe('60:00');
    expect(formatDuration(3661)).toBe('61:01');
  });

  it('truncates fractional seconds rather than rounding', () => {
    // 90.9s → 1:30, not 1:31
    expect(formatDuration(90.9)).toBe('1:30');
    expect(formatDuration(59.99)).toBe('0:59');
  });
});
