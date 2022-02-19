import { useEffect, useState } from "react";
import { BribeDataType } from "types/BribeData";
import { ServiceType } from "types/Service";
import { VoteDataType } from "types/VoteData";
import { DashboardType } from "types/Dashboard";

import { getResults } from "hooks/voteSnapshot";

export interface Bribes {
  results: BribeDataType[];
}

export interface DashboardReturn {
  results: DashboardType[];
  totalVotes: number;
  totalBribeAmount: number;
}

const useGetData = () => {
  console.log("getData");

  const dataURL = "https://beetswars-data.vercel.app/bribe-data.json";

  // const [bribeResult, setBribeResult] = useState<ServiceType<Bribes>>({
  //   status: "loading",
  // });

  // const [voteResult, setVoteResult] = useState<ServiceType<VoteDataType>>({
  //   status: "loading",
  // });

  const [dashboardResult, setDashboardResult] = useState<
    ServiceType<DashboardReturn>
  >({ status: "loading" });

  useEffect(() => {
    const fetchDashboardData = async () => {
      const bribeData = await fetch(dataURL || "")
        .then((response) => response.json())
        .then((response: Bribes) => {
          return response;
        });

      const voteData = await getResults().then((response: VoteDataType) => {
        return response;
      });

      const dashboardData = normalizeDashboardData(bribeData, voteData);

      setDashboardResult({
        status: "loaded",
        payload: {
          results: dashboardData,
          totalVotes: voteData.votingResults.sumOfResultsBalance,
          totalBribeAmount: dashboardData
            .map((item) => item.overallValue)
            .reduce((prev, curr) => prev + curr, 0),
        },
      });
    };

    const normalizeDashboardData = (bribes: Bribes, voteData: VoteDataType) => {
      const list: DashboardType[] = [];
      console.dir(voteData);

      bribes.results.map((bribe) => {
        const votePercentage =
          (voteData.votingResults.resultsByVoteBalance[bribe.voteindex] /
            voteData.votingResults.sumOfResultsBalance) *
          100;

        //special code for Stable Credit Sonata (CREDIT-etc
        //Reward: 💳 3000$ in $Credit for each 1% (maximum of 10%) 💵 3000$ in USDC for every 1% above 10% (maximum of another 10%)
        if (bribe.voteindex === 43 && votePercentage >= 10) {
          bribe.rewardamount = 30000;
          bribe.percentagethreshold = 10;
        }

        const percentAboveThreshold = Math.max(
          0,
          votePercentage - bribe.percentagethreshold
        );
        const percentValue =
          bribe.percentagerewardamount * percentAboveThreshold;

        const overallValue = Math.min(
          bribe.rewardamount + percentValue,
          isNaN(bribe.rewardcap) ? Infinity : bribe.rewardcap
        );

        const data: DashboardType = {
          poolName: voteData.proposal.choices[bribe.voteindex],
          poolUrl: bribe.poolurl,
          rewardDescription: bribe.rewarddescription,
          rewardValue: bribe.rewardamount,
          percentAboveThreshold: percentAboveThreshold,
          percentValue: percentValue,
          overallValue: overallValue,
          voteTotal:
            voteData.votingResults.resultsByVoteBalance[bribe.voteindex],
          votePercentage: votePercentage,
          valuePerVote:
            overallValue /
            voteData.votingResults.resultsByVoteBalance[bribe.voteindex],
        };

        list.push(data);
      });
      return list;
    };
    fetchDashboardData();
  }, [dataURL]);

  return dashboardResult;
};

export default useGetData;
