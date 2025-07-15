import { expect, test } from 'vitest'
import Highs from "highs";


import { buildLpp, buildNodeConnections } from "./index"

import { initialNodes } from "../graph/nodes";
import { initialEdges } from "../graph/edges";
import { writeFileSync } from 'fs';

const load = (async (url: string) => {
  console.log("Loading Highs from", url);
  return await Highs({ locateFile: (file: string) => url + file });
})("node_modules/highs/build/");

test("solver runs", async () => {  
  const connections = buildNodeConnections(initialNodes, initialEdges);
  const highs = await load;
  const lpp = buildLpp(connections.nodeConnections, connections.openConnections, [{
    dir: "output",
    productId: "acid",
    qty: 48,
    type: "eq"
  },{
    dir: "output",
    productId: "air_pollution",
    qty: 48,
    type: "gt"
  }])

  // const runId = new Date().getTime();
  // writeFileSync("./runs/"+(runId)+".json", JSON.stringify({
  //   ...connections,
  //   ...lpp,
  // }, null, 2))
  
  const result = highs.solve(lpp.lpp);
  // console.log("Run",runId);
  console.log(lpp.lpp);

  console.log(result.Status);
  expect(result).toStrictEqual(quickTestResult);
  
  if (result.Status == "Optimal") {
    console.log(Object.keys(result.Columns).map(c => {
      const col = result.Columns[c];
      return col.Name + " = " + col.Primal
    }).sort().join('\n'))
  }
})

const quickTestResult = {
  Status: "Optimal",
  Columns: {
    exhaust_sink: {
      Index: 0,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: -360,
      Dual: -0,
      Name: "exhaust_sink",
      Type: "Continuous",
    },
    steam_hi_sink: {
      Index: 1,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: -96,
      Dual: -0,
      Name: "steam_hi_sink",
      Type: "Continuous",
    },
    n_0: {
      Index: 2,
      Status: "BS",
      Lower: 0,
      Upper: Infinity,
      Primal: 6,
      Dual: -0,
      Name: "n_0",
      Type: "Continuous",
    },
    n_1: {
      Index: 3,
      Status: "BS",
      Lower: 0,
      Upper: Infinity,
      Primal: 2,
      Dual: -0,
      Name: "n_1",
      Type: "Continuous",
    },
    n_2: {
      Index: 4,
      Status: "BS",
      Lower: 0,
      Upper: Infinity,
      Primal: 4,
      Dual: -0,
      Name: "n_2",
      Type: "Continuous",
    },
    c0_sink: {
      Index: 5,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 1,
      Name: "c0_sink",
      Type: "Continuous",
    },
    n_3: {
      Index: 6,
      Status: "BS",
      Lower: 0,
      Upper: Infinity,
      Primal: 2,
      Dual: -0,
      Name: "n_3",
      Type: "Continuous",
    },
    c1_sink: {
      Index: 7,
      Status: "UB",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -2,
      Name: "c1_sink",
      Type: "Continuous",
    },
    c2_sink: {
      Index: 8,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -0,
      Name: "c2_sink",
      Type: "Continuous",
    },
    c4_sink: {
      Index: 9,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 48,
      Dual: -0,
      Name: "c4_sink",
      Type: "Continuous",
    },
    acid_sink: {
      Index: 10,
      Status: "UB",
      Lower: 48,
      Upper: 48,
      Primal: 48,
      Dual: -1,
      Name: "acid_sink",
      Type: "Continuous",
    },
    c5_sink: {
      Index: 11,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 360,
      Dual: -0,
      Name: "c5_sink",
      Type: "Continuous",
    },
    c8_sink: {
      Index: 12,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 144,
      Dual: -0,
      Name: "c8_sink",
      Type: "Continuous",
    },
    carbon_dioxide_sink: {
      Index: 13,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 144,
      Dual: -0,
      Name: "carbon_dioxide_sink",
      Type: "Continuous",
    },
    c10_sink: {
      Index: 14,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 48,
      Dual: -0,
      Name: "c10_sink",
      Type: "Continuous",
    },
    air_pollution_sink: {
      Index: 15,
      Status: "LB",
      Lower: 48,
      Upper: Infinity,
      Primal: 48,
      Dual: -8.5,
      Name: "air_pollution_sink",
      Type: "Continuous",
    },
    c11_sink: {
      Index: 16,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 96,
      Dual: -0,
      Name: "c11_sink",
      Type: "Continuous",
    },
    c12_sink: {
      Index: 17,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 24000,
      Dual: -0,
      Name: "c12_sink",
      Type: "Continuous",
    },
    mechanical_power_sink: {
      Index: 18,
      Status: "BS",
      Lower: -Infinity,
      Upper: Infinity,
      Primal: 24000,
      Dual: -0,
      Name: "mechanical_power_sink",
      Type: "Continuous",
    },
  },
  Rows: [
    {
      Index: 0,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -1,
      Name: "c0",
    }, {
      Index: 1,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -2,
      Name: "c1",
    }, {
      Index: 2,
      Status: "BS",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 0,
      Name: "c2",
    }, {
      Index: 3,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -1,
      Name: "c4",
    }, {
      Index: 4,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -1,
      Name: "acid_sink",
    }, {
      Index: 5,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -1,
      Name: "c5",
    }, {
      Index: 6,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -1,
      Name: "exhaust_sink",
    }, {
      Index: 7,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 0,
      Name: "c8",
    }, {
      Index: 8,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 0,
      Name: "carbon_dioxide_sink",
    }, {
      Index: 9,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -8.5,
      Name: "c10",
    }, {
      Index: 10,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -8.5,
      Name: "air_pollution_sink",
    }, {
      Index: 11,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -1,
      Name: "c11",
    }, {
      Index: 12,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: -1,
      Name: "steam_hi_sink",
    }, {
      Index: 13,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 0,
      Name: "c12",
    }, {
      Index: 14,
      Status: "FX",
      Lower: 0,
      Upper: 0,
      Primal: 0,
      Dual: 0,
      Name: "mechanical_power_sink",
    }
  ],
  ObjectiveValue: -456,
}

