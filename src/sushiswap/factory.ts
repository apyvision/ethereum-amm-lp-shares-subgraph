/* eslint-disable prefer-const */
import {PairCreated} from '../../generated/Factory/Factory'
import {log} from "@graphprotocol/graph-ts/index";
import {Pair as PairTemplate} from '../../generated/templates'

export function handleNewPair(event: PairCreated): void {
  // create the tracked contract based on the template
  log.error("[Sushiswap] Creating factory tracking for pair: {}", [event.params.pair.toHexString()])
  PairTemplate.create(event.params.pair)
}
