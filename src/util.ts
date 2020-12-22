import {LiquidityPosition, UserLiquidityPositionDayData} from "../generated/schema";
import {Address, BigInt, ethereum} from "@graphprotocol/graph-ts/index";

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

export function updateDayData(lp: LiquidityPosition, userAddress: Address, event: ethereum.Event): UserLiquidityPositionDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = lp.id
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let dayData = UserLiquidityPositionDayData.load(dayPairID)
  if (dayData === null) {
    dayData = new UserLiquidityPositionDayData(dayPairID)
    dayData.date = dayStartTimestamp
    dayData.poolProviderName = lp.poolProviderName
    dayData.poolAddress = lp.poolAddress
    dayData.userAddress = userAddress
  }

  dayData.balance = lp.balance
  dayData.balanceFromMintBurn = lp.balanceFromMintBurn
  dayData.save()

  return dayData as UserLiquidityPositionDayData
}
