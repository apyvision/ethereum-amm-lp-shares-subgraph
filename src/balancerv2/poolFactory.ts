import { Address } from '@graphprotocol/graph-ts';
import {WeightedPool as WeightedPoolTemplate} from '../../generated/templates'

// datasource
import {PoolCreated} from "../../generated/WeightedPoolFactory/WeightedPoolFactory";

export function handleNewWeightedPool(event: PoolCreated): void {
  let poolAddress: Address = event.params.pool;
  WeightedPoolTemplate.create(poolAddress);
}
