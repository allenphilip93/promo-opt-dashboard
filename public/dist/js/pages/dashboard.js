var startup = function(extData){

  'use strict'

  /* uPlotJS
   * -------
   * Here we will create a few charts using uPlotJS
   */

  document.getElementById('uPlotChart').innerHTML = "";

  let initXmin = 1;
  let initXmax = 4.5;

  let viaRanger = false;
  let viaZoom = false;

  var rangerOpts = {
    // title: extData.dmdunit + "/" + extData.dmdgroup + "/" + extData.loc,
    width: 1500,
    height: 150,
    cursor: {
      points: {
        show: false,
      },
      drag: {
        setScale: false,
        x: true,
        y: false,
      },
    },
    legend: {
      show: false
    },
    scales: {
      x: {
        time: true,
      },
    },
    series: [{}],
    hooks: {
      setSelect: [
        uRanger => {
          if (!viaZoom) {
            viaRanger = true;
            let min = uRanger.posToVal(uRanger.select.left, 'x');
            let max = uRanger.posToVal(uRanger.select.left + uRanger.select.width, 'x');
            uZoomed.setScale('x', {min, max});
            viaRanger = false;
          }
        }
      ],
      ready: [
        uRanger => {
          let left = Math.round(uRanger.valToPos(initXmin, 'x'));
          let width = Math.round(uRanger.valToPos(initXmax, 'x')) - left;
          let height = uRanger.root.querySelector(".over").getBoundingClientRect().height;
          uRanger.setSelect({left, width, height}, false);
        }
      ]
    }
  };

  var data = [];
  var series = [{}];
  data.push(getDateLabels(extData.startdate, extData.feature[0].data.length));
  extData.feature.forEach(function(value, index, array) {
    data.push(value.data);
    if (value.iscategorical) {
      series.push(getSeries(value, "Categorical", 1, "rgba(0,0,255,0.05)"));
    } else {
      series.push(getSeries(value));
    }
  });

  rangerOpts.series = series;
  let uRanger = new uPlot(rangerOpts, data, document.getElementById('uPlotChart'));

  // var opts = {
    // title: extData.dmdunit + "/" + extData.dmdgroup + "/" + extData.loc,
    // width: 1500,
    // height: 500,
  //   plugins: [
  //     wheelZoomPlugin({factor: 0.75})
  //   ],
  // //	spanGaps: true,
  //   series: [{}],
  //   axes: [
  //     {
  //       label: "X Axis Time"
  //     },
  //     {
  //       scale: 'Categorical',
  //       side: 1,
  //       values: (u, vals, space) => vals.map(v => +v.toFixed(1) + ""),
  //     },{
  //       scale: 'Numerical',
  //       values: (u, vals, space) => vals.map(v => +v.toFixed(2) + ""),
  //     }
  //   ],
  //   scales: {
  //     x: {
  //       time: true,
  //     },
  //   	y: {
  //   		auto: false,
  //   	}
  //   }
  // };

  var zoomedOpts = {
    title: extData.dmdunit + "/" + extData.dmdgroup + "/" + extData.loc,
    width: 1500,
    height: 500,
    scales: {
      x: {
        time: true
        // min: initXmin,
        // max: initXmax,
      },
    },
    series: [{}],
    hooks: {
      setScale: [
        (uZoomed, key) => {
          if (key == 'x' && !viaRanger) {
            viaZoom = true;
            let left = Math.round(uRanger.valToPos(uZoomed.scales.x.min, 'x'));
            let right = Math.round(uRanger.valToPos(uZoomed.scales.x.max, 'x'));
            uRanger.setSelect({left, width: right - left});
            viaZoom = false;
          }
        }
      ]
    }
  };
  
  // data = [];
  // data.push(getDateLabels(extData.startdate, extData.feature[0].data.length));
  // extData.feature.forEach(function(value, index, array) {
  //   data.push(value.data);
  //   if (value.iscategorical) {
  //     // opts.series.push(getSeries(value, "Categorical", 1, "rgba(0,0,255,0.05)"));
  //     // rangerOpts.series.push(getSeries(value, "Categorical", 1, "rgba(0,0,255,0.05)"));
  //     zoomedOpts.series.push(getSeries(value, "Categorical", 1, "rgba(0,0,255,0.05)"));
  //   } else {
  //     // opts.series.push(getSeries(value));
  //     // rangerOpts.series.push(getSeries(value));
  //     zoomedOpts.series.push(getSeries(value));
  //   }
  // });
  
  // let u = new uPlot(opts, data, document.getElementById('uPlotChart'));
  zoomedOpts.series = series;
  let uZoomed = new uPlot(zoomedOpts, data, document.getElementById('uPlotChart'));


  $(document).ready(function() {
		var table = $('#modelconfigtable').DataTable();
    table.destroy();
    $('#modelconfigtable').DataTable({
			"order": [[ 1, "desc" ]]
    });
	});
};

function wheelZoomPlugin(opts) {
  let factor = opts.factor || 0.75;

  let xMin, xMax, yMin, yMax, xRange, yRange;

  function clamp(nRange, nMin, nMax, fRange, fMin, fMax) {
    if (nRange > fRange) {
      nMin = fMin;
      nMax = fMax;
    }
    else if (nMin < fMin) {
      nMin = fMin;
      nMax = fMin + nRange;
    }
    else if (nMax > fMax) {
      nMax = fMax;
      nMin = fMax - nRange;
    }

    return [nMin, nMax];
  }

  return {
    hooks: {
      ready: u => {
        xMin = u.scales.x.min;
        xMax = u.scales.x.max;
        yMin = u.scales.y.min;
        yMax = u.scales.y.max;

        xRange = xMax - xMin;
        yRange = yMax - yMin;

        let plot = u.root.querySelector(".over");
        let rect = plot.getBoundingClientRect();

        plot.addEventListener("wheel", e => {
          e.preventDefault();

          let {left, top} = u.cursor;

          let leftPct = left/rect.width;
          let btmPct = 1 - top/rect.height;
          let xVal = u.posToVal(left, "x");
          let yVal = u.posToVal(top, "y");
          let oxRange = u.scales.x.max - u.scales.x.min;
          let oyRange = u.scales.y.max - u.scales.y.min;

          let nxRange = e.deltaY < 0 ? oxRange * factor : oxRange / factor;
          let nxMin = xVal - leftPct * nxRange;
          let nxMax = nxMin + nxRange;
          [nxMin, nxMax] = clamp(nxRange, nxMin, nxMax, xRange, xMin, xMax);

          let nyRange = e.deltaY < 0 ? oyRange * factor : oyRange / factor;
          let nyMin = yVal - btmPct * nyRange;
          let nyMax = nyMin + nyRange;
          [nyMin, nyMax] = clamp(nyRange, nyMin, nyMax, yRange, yMin, yMax);

          u.batch(() => {
            u.setScale("x", {
              min: nxMin,
              max: nxMax,
            });

            u.setScale("y", {
              min: nyMin,
              max: nyMax,
            });
          });
        });
      }
    }
  };
}

function tooltipsPlugin(opts) {
  function init(u, opts, data) {
    let plot = u.root.querySelector(".over");

    let ttc = u.cursortt = document.createElement("div");
    ttc.className = "tooltip";
    ttc.textContent = "(x,y)";
    ttc.style.pointerEvents = "none";
    ttc.style.position = "absolute";
    ttc.style.background = "rgba(0,0,255,0.1)";
    plot.appendChild(ttc);

    u.seriestt = opts.series.map((s, i) => {
      if (i == 0) return;

      let tt = document.createElement("div");
      tt.className = "tooltip";
      tt.textContent = "Tooltip!";
      tt.style.pointerEvents = "none";
      tt.style.position = "absolute";
      tt.style.background = "rgba(0,0,0,0.1)";
      tt.style.color = s.color;
      tt.style.display = s.show ? null : "none";
      plot.appendChild(tt);
      return tt;
    });

    function hideTips() {
      ttc.style.display = "none";
      u.seriestt.forEach((tt, i) => {
        if (i == 0) return;

        tt.style.display = "none";
      });
    }

    function showTips() {
      ttc.style.display = null;
      u.seriestt.forEach((tt, i) => {
        if (i == 0) return;

        let s = u.series[i];
        tt.style.display = s.show ? null : "none";
      });
    }

    plot.addEventListener("mouseleave", () => {
      if (!u.cursor.locked) {
      //	u.setCursor({left: -10, top: -10});
        hideTips();
      }
    });

    plot.addEventListener("mouseenter", () => {
      showTips();
    });

    hideTips();
  }

  function setCursor(u) {
    const {left, top, idx} = u.cursor;

    // this is here to handle if initial cursor position is set
    // not great (can be optimized by doing more enter/leave state transition tracking)
  //	if (left > 0)
  //		u.cursortt.style.display = null;

    u.cursortt.style.left = left + "px";
    u.cursortt.style.top = top + "px";
    u.cursortt.textContent = "(" + u.posToVal(left, "x").toFixed(2) + ", " + u.posToVal(top, "y").toFixed(2) + ")";

    // can optimize further by not applying styles if idx did not change
    u.seriestt.forEach((tt, i) => {
      if (i == 0) return;

      let s = u.series[i];

      if (s.show) {
        // this is here to handle if initial cursor position is set
        // not great (can be optimized by doing more enter/leave state transition tracking)
      //	if (left > 0)
      //		tt.style.display = null;

        let xVal = u.data[0][idx];
        let yVal = u.data[i][idx];

        tt.textContent = "(" + xVal + ", " + yVal + ")";

        tt.style.left = Math.round(u.valToPos(xVal, 'x')) + "px";
        tt.style.top = Math.round(u.valToPos(yVal, s.scale)) + "px";
      }
    });
  }

  return {
    hooks: {
      init,
      setCursor,
      setScale: [
        (u, key) => {
          console.log('setScale', key);
        }
      ],
      setSeries: [
        (u, idx) => {
          console.log('setSeries', idx);
        }
      ],
    },
  };
}