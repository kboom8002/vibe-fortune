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
  fiveElements: { wood: number; fire: number; earth: number; metal: number; water: number }
): DayMasterStrengthResult {
  const supportingElement = GENERATED_BY[dmElement];
  
  const sameScore = fiveElements[dmElement as keyof typeof fiveElements] || 0;
  const supportScore = fiveElements[supportingElement as keyof typeof fiveElements] || 0;
  
  const total = Object.values(fiveElements).reduce((sum, val) => sum + val, 0) || 1.0;
  
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
