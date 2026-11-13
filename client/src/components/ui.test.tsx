import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Stars } from './ui';

describe('interactive star rating', () => {
  it('keeps one tab stop and moves selection with arrow keys', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Stars value={3} onChange={onChange} label="Your rating" />);
    const threeStars = screen.getByRole('radio', { name: '3 stars' });
    const fourStars = screen.getByRole('radio', { name: '4 stars' });

    expect(threeStars.getAttribute('tabindex')).toBe('0');
    expect(fourStars.getAttribute('tabindex')).toBe('-1');

    threeStars.focus();
    fireEvent.keyDown(threeStars, { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith(4);
    expect(document.activeElement).toBe(fourStars);

    rerender(<Stars value={4} onChange={onChange} label="Your rating" />);
    expect(fourStars.getAttribute('tabindex')).toBe('0');
  });

  it('wraps from the first star to the last with ArrowLeft', () => {
    const onChange = vi.fn();
    render(<Stars value={1} onChange={onChange} label="Your rating" />);
    const firstStar = screen.getByRole('radio', { name: '1 star' });
    const fifthStar = screen.getByRole('radio', { name: '5 stars' });

    firstStar.focus();
    fireEvent.keyDown(firstStar, { key: 'ArrowLeft' });

    expect(onChange).toHaveBeenCalledWith(5);
    expect(document.activeElement).toBe(fifthStar);
  });
});
