/* eslint-disable prefer-const */
import { PairCreated } from '../../generated/Factory/Factory'
import { Pair as PairTemplate } from '../../generated/templates'

export function handleNewPair(event: PairCreated): void {
  // create the tracked contract based on the template
  PairTemplate.create(event.params.pair)
}
