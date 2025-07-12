import { expect, test } from 'vitest'


import solver, { rebuildContraints, useHighs } from "./index"

import { initialNodes, type CustomNodeType } from "../graph/nodes";
import { initialEdges, type CustomEdgeType } from "../graph/edges";


test("solver runs", () => {
  const exp = `
minimize
  obj: exhaust+steam_hi
subject to
    
      \\c0: steam_lo
      c0: -24 n0 +24 n2 +24 n3 = 0
    
      \\c1: water
      c1: +12 n0 -24 n2 -12 n1 = 0
    
      \\c2: sulfur
      c2: -6 n1 +6 n2 = 0
    
      \\c4: acid
      c4: acid-24 n1 = 0
    
      \\c5: exhaust
      c5: exhaust-180 n2 = 0
    
      \\c8: carbon_dioxide
      c8: carbon_dioxide-72 n2 = 0
    
      \\c10: air_pollution
      c10: air_pollution-24 n2 = 0
    
      \\c11: steam_hi
      c11: steam_hi-24 n3 = 0
    
      \\c12: mechanical_power
      c12: mechanical_power-6000 n3 = 0
    

      \\n0: lo-press_steam_condensation

      \\n1: acid_mixing_1

      \\n2: exhaust_filtering_1

      \\n3: turbinehighpress
Bounds 
  0 <= exhaust
  0 <= steam_hi
  acid = 48
end`;
  const res = rebuildContraints(initialNodes, initialEdges);
  expect(res.lpp.split('\n')).toEqual(exp.split('\n'));
})
