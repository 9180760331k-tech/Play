import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse), (hover: none)';

export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setCoarse(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return coarse;
}
