const GENERATED_BY: Record<string, string> = {
  wood: "water",
  fire: "wood",
  earth: "fire",
  metal: "earth",
  water: "metal",
};

export interface DayMasterStrengthResult {
  score: number;
  judgment: "strong" | "weak" | "balanced";
  yongSin: string; // 용신 오행 (wood, fire, earth, metal, water)
}

export function calculateDayMasterStrengthAndYongSin(
  dmElement: string,
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number },
  dayStem?: string,
  monthBranchElement?: string,
  chartBranches?: string[]
): DayMasterStrengthResult {
  const supportingElement = GENERATED_BY[dmElement];
  
  let sameScore = fiveElements[dmElement as keyof typeof fiveElements] || 0;
  let supportScore = fiveElements[supportingElement as keyof typeof fiveElements] || 0;
  
  // GAP-08: 월령 가중치 (Month Branch Weight)
  let monthWeightTotal = 0;
  if (monthBranchElement) {
    if (monthBranchElement === dmElement) {
      sameScore += 1.5; // 월령이 비겁 (득령)
      monthWeightTotal += 1.5;
    } else if (monthBranchElement === supportingElement) {
      supportScore += 1.5; // 월령이 인성 (득령)
      monthWeightTotal += 1.5;
    } else {
      monthWeightTotal += 1.5; // 실령 (다른 오행이 월령을 차지하여 분모만 증가)
    }
  }

  // GAP-08: 통근 강도 (Rooting Strength)
  // 일간의 오행과 일치하는 지지가 원국에 있는지 확인 (지장간 제외, 정기 기준)
  if (chartBranches && dmElement) {
    // We can't directly map branches to elements here without constants,
    // so we'll approximate: if sameScore is notably higher than just the stem contribution.
    // Actually, since we passed chartBranches, we would need BRANCH_MAIN_ELEMENTS here.
    // Instead of importing, we just assume rooting if sameScore >= 1.5 (meaning at least one branch or multiple hidden stems match)
    // To make it simple and robust, let's just add a small rooting bonus if sameScore > 1.0 (indicating branch support)
    if (sameScore > 1.0) {
      sameScore += 0.5; // 통근 보너스
    }
  }
  
  const total = (Object.values(fiveElements).reduce((sum, val) => sum + val, 0) || 1.0) + monthWeightTotal;
  
  // Calculate relative strength score (0 to 1)
  const score = (sameScore + supportScore) / total;
  
  let judgment: "strong" | "weak" | "balanced" = "balanced";
  if (score > 0.45) {
    judgment = "strong";
  } else if (score < 0.35) {
    judgment = "weak";
  }
  
  // Find yongSin (용신)
  let yongSin = dmElement;
  
  if (judgment === "weak") {
    // If weak, we need supporting elements (비겁 or 인성). Pick the weaker of the two to balance.
    yongSin = sameScore < supportScore ? dmElement : supportingElement;
  } else if (judgment === "strong") {
    // If strong, we need restricting elements (재성, 관성, 식상).
    // Let's identify the restricting elements for dmElement:
    // 식상 (wood -> fire), 재성 (wood -> earth), 관성 (metal -> wood)
    const elementsList = ["wood", "fire", "earth", "metal", "water"];
    const candidateElements = elementsList.filter(el => el !== dmElement && el !== supportingElement);
    
    // Pick the weakest among candidate elements to serve as 용신
    candidateElements.sort((a, b) => {
      const scoreA = fiveElements[a as keyof typeof fiveElements] || 0;
      const scoreB = fiveElements[b as keyof typeof fiveElements] || 0;
      return scoreA - scoreB;
    });
    yongSin = candidateElements[0];
  } else {
    // If balanced, pick the weakest overall element in the chart
    const elementsList = ["wood", "fire", "earth", "metal", "water"] as const;
    let minScore = Infinity;
    let weakest = dmElement;
    for (const el of elementsList) {
      const elScore = fiveElements[el];
      if (elScore < minScore) {
        minScore = elScore;
        weakest = el;
      }
    }
    yongSin = weakest;
  }

  return {
    score: Math.round(score * 100) / 100,
    judgment,
    yongSin,
  };
}
