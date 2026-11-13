import { expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import { CruiseSeasonAuthorityBlock } from '@/components/cruise-season/CruiseSeasonAuthorityBlock';

it('renders eight ships followed by eight mapped itineraries in the actual shared home section', () => {
  const { getByRole, container } = render(<CruiseSeasonAuthorityBlock container="container" />);
  const ships = getByRole('list', { name: 'Galeria dos oito navios' });
  const routes = getByRole('list', { name: 'Roteiros para a sua próxima viagem' });
  expect(within(ships).getAllByRole('listitem')).toHaveLength(8);
  expect(within(routes).getAllByRole('listitem')).toHaveLength(8);
  expect(routes.querySelectorAll('svg[role="img"]')).toHaveLength(8);
  for (const a of within(routes).getAllByRole('link')) expect(a.getAttribute('href')).toMatch(/itinerary=route-\d+&variant=\d+#csp-roteiros$/);
  expect(container.querySelectorAll('.csi')).toHaveLength(1);
});
