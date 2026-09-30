/**
 * AGRIGUARD
 * Crop Health Monitoring System
 * Problem Statement 3.1
 *
 * Sentinel-2 → NDVI + NDMI + NDRE
 * → Historical Comparison → Stress Detection
 * → Healthy / Moderate / Stressed
 */

// ================= CONFIG =================

var CFG = {
  lon: 79.14,
  lat: 10.78,

  // 5 km radius = approx. 10 x 10 km analysis area
  radiusKm: 5,

  windowDays: 30,
  baselineYears: 3,
  maxCloud: 40,

  stressNDVI: 0.35,
  modNDVI: 0.55,

  stressDrop: -0.20,
  modDrop: -0.10
};

var PAL = [
  'd73027', // stressed
  'fee08b', // moderate
  '1a9850'  // healthy
];

var S2 = 'COPERNICUS/S2_SR_HARMONIZED';


// ================= SENTINEL-2 =================

function maskS2(img) {

  var scl = img.select('SCL');

  var ok = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));

  return img
    .select(['B4', 'B5', 'B8', 'B11'])
    .updateMask(ok)
    .divide(10000)
    .copyProperties(img, ['system:time_start']);
}


// ================= VEGETATION INDICES =================

function addIndices(img) {

  var ndvi = img
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI');

  var ndmi = img
    .normalizedDifference(['B8', 'B11'])
    .rename('NDMI');

  var ndre = img
    .normalizedDifference(['B8', 'B5'])
    .rename('NDRE');

  return ee.Image.cat([
    ndvi,
    ndmi,
    ndre
  ]);
}


// ================= COMPOSITE =================

function composite(start, end, aoi) {

  return ee.ImageCollection(S2)
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(
      ee.Filter.lt(
        'CLOUDY_PIXEL_PERCENTAGE',
        CFG.maxCloud
      )
    )
    .map(maskS2)
    .map(addIndices)
    .median()
    .clip(aoi);
}


// ================= CLASSIFICATION =================

function classify(cur, base, crop) {

  var ndvi = cur.select('NDVI');

  var change = ndvi
    .subtract(base)
    .divide(base)
    .rename('CHANGE');

  var cls = ee.Image(3)

    // Moderate
    .where(
      ndvi.lt(CFG.modNDVI)
        .or(change.lt(CFG.modDrop)),
      2
    )

    // Stressed
    .where(
      ndvi.lt(CFG.stressNDVI)
        .or(change.lt(CFG.stressDrop)),
      1
    )

    .updateMask(crop)
    .updateMask(ndvi.mask())
    .rename('CLASS');

  return {
    cls: cls,
    chg: change
  };
}


// ================= UI =================

var panel = ui.Panel({
  style: {
    width: '380px',
    padding: '10px'
  }
});

panel.add(
  ui.Label(
    '🌾 AgriGuard',
    {
      fontSize: '26px',
      fontWeight: 'bold',
      color: '1a9850'
    }
  )
);

panel.add(
  ui.Label(
    'Crop Health Monitoring System',
    {color: '555'}
  )
);


// DATE

var today = new Date()
  .toISOString()
  .slice(0, 10);

var dateBox = ui.Textbox({
  value: today,
  style: {
    stretch: 'horizontal'
  }
});

panel.add(
  ui.Label('📅 Analysis End Date (YYYY-MM-DD)')
);

panel.add(dateBox);


// MODE

var modeSel = ui.Select({
  items: [
    'Pick study area',
    'Inspect point'
  ],
  value: 'Pick study area'
});

panel.add(
  ui.Label('🖱 Map Click Mode')
);

panel.add(modeSel);


// ANALYZE BUTTON

panel.add(
  ui.Button({
    label: '🔍 Analyze',
    onClick: function () {
      analyze();
    }
  })
);


// STATUS

var statusLabel = ui.Label(
  'Click the map to choose a study area.',
  {
    color: '888'
  }
);

var statsPanel = ui.Panel();

var chartPanel = ui.Panel();

var recLabel = ui.Label(
  '',
  {
    fontWeight: 'bold',
    whiteSpace: 'pre-wrap'
  }
);

panel.add(statusLabel);
panel.add(statsPanel);
panel.add(recLabel);
panel.add(chartPanel);


// ================= LEGEND =================

var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '6px'
  }
});

[
  ['Healthy', PAL[2]],
  ['Moderate', PAL[1]],
  ['Stressed', PAL[0]]
].forEach(function (r) {

  legend.add(
    ui.Panel(
      [
        ui.Label(
          '',
          {
            backgroundColor: '#' + r[1],
            padding: '8px',
            margin: '2px'
          }
        ),

        ui.Label(
          r[0],
          {
            margin: '4px'
          }
        )
      ],
      ui.Panel.Layout.Flow('horizontal')
    )
  );
});


// ================= MAP =================

var map = ui.Map();

map.setOptions('SATELLITE');

map.add(legend);

ui.root.clear();

ui.root.add(
  ui.SplitPanel(
    panel,
    map
  )
);


// ================= STATE =================

var state = {
  aoi: null,
  cls: null,
  base: null,
  cur: null,
  chg: null
};


// ================= MAIN ANALYSIS =================

function analyze() {

  statusLabel.setValue(
    '⏳ Processing satellite data...'
  );

  statsPanel.clear();

  chartPanel.clear();

  recLabel.setValue('');


  // STUDY AREA

  var aoi = ee.Geometry
    .Point([
      CFG.lon,
      CFG.lat
    ])
    .buffer(
      CFG.radiusKm * 1000
    )
    .bounds();


  // DATES

  var end = ee.Date(
    dateBox.getValue()
  );

  var start = end.advance(
    -CFG.windowDays,
    'day'
  );


  // CURRENT IMAGE

  var cur = composite(
    start,
    end,
    aoi
  );


  // HISTORICAL BASELINE

  var base = ee.ImageCollection(

    ee.List.sequence(
      1,
      CFG.baselineYears
    ).map(function (y) {

      var e = end.advance(
        ee.Number(y).multiply(-1),
        'year'
      );

      return composite(
        e.advance(
          -CFG.windowDays,
          'day'
        ),
        e,
        aoi
      )
      .select('NDVI');

    })

  )
  .mean()
  .rename('BASE');


  // CROPLAND MASK

  var crop = ee.Image(
    'ESA/WorldCover/v200/2021'
  )
  .select('Map')
  .eq(40);


  // CLASSIFICATION

  var result = classify(
    cur,
    base,
    crop
  );


  state = {
    aoi: aoi,
    cls: result.cls,
    base: base,
    cur: cur,
    chg: result.chg
  };


  // ================= MAP LAYERS =================

  map.layers().reset();

  map.centerObject(
    aoi,
    12
  );


  map.addLayer(
    cur.select('NDVI'),
    {
      min: 0,
      max: 1,
      palette: [
        'brown',
        'yellow',
        'green'
      ]
    },
    'NDVI',
    false
  );


  map.addLayer(
    cur.select('NDMI'),
    {
      min: -0.2,
      max: 0.6,
      palette: [
        'red',
        'white',
        'blue'
      ]
    },
    'NDMI',
    false
  );


  map.addLayer(
    cur.select('NDRE'),
    {
      min: 0,
      max: 0.6,
      palette: [
        'brown',
        'yellow',
        'green'
      ]
    },
    'NDRE',
    false
  );


  map.addLayer(
    result.chg,
    {
      min: -0.4,
      max: 0.4,
      palette: [
        'red',
        'white',
        'green'
      ]
    },
    'NDVI Change vs Baseline',
    false
  );


  map.addLayer(
    result.cls,
    {
      min: 1,
      max: 3,
      palette: PAL
    },
    '🌾 Crop Health'
  );


  // ================= STATISTICS =================

  var hist = result.cls.reduceRegion({
    reducer:
      ee.Reducer.frequencyHistogram(),

    geometry: aoi,

    scale: 20,

    maxPixels: 1e9
  });


  var means = cur
    .updateMask(crop)
    .reduceRegion({

      reducer:
        ee.Reducer.mean(),

      geometry: aoi,

      scale: 20,

      maxPixels: 1e9
    });


  var baseMean = base
    .updateMask(crop)
    .reduceRegion({

      reducer:
        ee.Reducer.mean(),

      geometry: aoi,

      scale: 20,

      maxPixels: 1e9
    });


  ee.Dictionary({

    h: hist.get('CLASS'),

    m: means,

    b: baseMean

  }).evaluate(function (r, err) {

    if (
      err ||
      !r ||
      !r.h ||
      !r.m ||
      !r.b
    ) {

      statusLabel.setValue(
        '❌ No cloud-free cropland pixels found. Try another date or location.'
      );

      return;
    }


    var c1 = r.h['1'] || 0;
    var c2 = r.h['2'] || 0;
    var c3 = r.h['3'] || 0;

    var total =
      c1 + c2 + c3;


    if (total === 0) {

      statusLabel.setValue(
        '❌ No valid cropland pixels found.'
      );

      return;
    }


    var pct = function (v) {

      return (
        100 * v / total
      ).toFixed(1) + '%';

    };


    var changePercent =
      100 *
      (
        r.m.NDVI -
        r.b.BASE
      ) /
      r.b.BASE;


    statusLabel.setValue(
      '📍 Study Area: ' +
      CFG.lon.toFixed(3) +
      ', ' +
      CFG.lat.toFixed(3) +
      '\n📅 ' +
      dateBox.getValue()
    );


    statsPanel.add(
      ui.Label(
        'NDVI: ' +
        r.m.NDVI.toFixed(2) +
        '    NDMI: ' +
        r.m.NDMI.toFixed(2) +
        '    NDRE: ' +
        r.m.NDRE.toFixed(2),
        {
          fontWeight: 'bold'
        }
      )
    );


    statsPanel.add(
      ui.Label(
        '🟢 Healthy: ' +
        pct(c3) +
        '\n🟡 Moderate: ' +
        pct(c2) +
        '\n🔴 Stressed: ' +
        pct(c1)
      )
    );


    statsPanel.add(
      ui.Label(
        'Baseline NDVI: ' +
        r.b.BASE.toFixed(2) +
        '\nCurrent NDVI: ' +
        r.m.NDVI.toFixed(2) +
        '\nChange: ' +
        changePercent.toFixed(1) +
        '%'
      )
    );


    // ================= RECOMMENDATION =================

    var stressPercent =
      100 * c1 / total;


    if (stressPercent > 30) {

      recLabel.setValue(
        '🚨 HIGH PRIORITY\n' +
        'Large stressed area detected.\n' +
        'Inspect for water stress, pests or nutrient deficiency.'
      );

    }

    else if (stressPercent > 10) {

      recLabel.setValue(
        '⚠️ MODERATE PRIORITY\n' +
        'Inspect the red zones and review irrigation/nutrient conditions.'
      );

    }

    else {

      recLabel.setValue(
        '✅ CONDITION GENERALLY GOOD\n' +
        'Continue routine crop monitoring.'
      );

    }

  });


  // ================= 12-MONTH HISTORY =================

  var monthly = ee.ImageCollection(

    ee.List.sequence(
      0,
      11
    ).map(function (m) {

      var e = end.advance(
        ee.Number(m).multiply(-1),
        'month'
      );

      return composite(
        e.advance(-1, 'month'),
        e,
        aoi
      )
      .select('NDVI')
      .updateMask(crop)
      .set(
        'system:time_start',
        e.millis()
      );

    })

  );


  chartPanel.add(

    ui.Chart.image.series({

      imageCollection: monthly,

      region: aoi,

      reducer:
        ee.Reducer.mean(),

      scale: 60,

      xProperty:
        'system:time_start'

    })

    .setOptions({

      title:
        '📈 Crop Health — 12 Month NDVI Trend',

      legend: {
        position: 'none'
      },

      colors: [
        '1a9850'
      ],

      vAxis: {
        title: 'NDVI'
      }

    })

  );

}


// ================= MAP CLICK =================

map.onClick(function (c) {

  if (
    modeSel.getValue() ===
      'Pick study area' ||
    !state.cls
  ) {

    CFG.lon = c.lon;

    CFG.lat = c.lat;

    analyze();

    return;
  }


  var img =
    state.cur
      .addBands(state.base)
      .addBands(state.chg)
      .addBands(state.cls);


  img.reduceRegion({

    reducer:
      ee.Reducer.first(),

    geometry:
      ee.Geometry.Point([
        c.lon,
        c.lat
      ]),

    scale: 10

  }).evaluate(function (v) {

    if (
      !v ||
      v.CLASS === null ||
      v.CLASS === undefined
    ) {

      statusLabel.setValue(
        '❌ No valid cropland data at this point.'
      );

      return;
    }


    var name = {

      1: '🔴 Potential Crop Stress',

      2: '🟡 Moderate',

      3: '🟢 Healthy'

    }[v.CLASS];


    statusLabel.setValue(

      '📍 Field Inspection\n' +

      'NDVI: ' +
      v.NDVI.toFixed(2) +

      '\nBaseline: ' +
      v.BASE.toFixed(2) +

      '\nChange: ' +
      (
        100 * v.CHANGE
      ).toFixed(1) +

      '%' +

      '\nNDMI: ' +
      v.NDMI.toFixed(2) +

      '\nNDRE: ' +
      v.NDRE.toFixed(2) +

      '\n\n' +
      name

    );

  });

});


// ================= INITIAL MAP =================

map.setCenter(
  CFG.lon,
  CFG.lat,
  11
);


// RUN INITIAL ANALYSIS

analyze();
