/** Indian packaged-food convention: green dot in a green square for veg, red for non-veg. */
export function VegMark({ veg }: { veg: boolean }) {
  const c = veg ? '#1F9D55' : '#D13B30';
  return (
    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2" style={{ borderColor: c }} role="img" aria-label={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      <span className="h-2 w-2 rounded-full" style={{ background: c }} />
    </span>
  );
}
