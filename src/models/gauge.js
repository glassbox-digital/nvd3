nv.models.gauge = function () {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------

    var margin = {top: 0, right: 0, bottom: 0, left: 0}
        , width = 500
        , height = 500
        , getX = function (d) {
            return d.x
        }
        , getY = function (d) {
            return d.y
        }
        , getThreshold = function (d) {
            return d.threshold;
        }
        , icon = function (d) {
        }
        , id = Math.floor(Math.random() * 10000) //Create semi-unique ID in case user doesn't select one
        , container = null
        , color = nv.utils.defaultColor()
        , tresholds = d3.scale.linear().range(['black', 'darkred', 'orange', 'green', 'darkgreen']).domain([0, 30, 60, 80, 100])
        , valueFormat = d3.format(',.2f')
        , showLabels = true
        , showChecks = false
        , labelsOutside = false
        , labelType = "key"
        , labelThreshold = .02 //if slice percentage is under this, don't show label
        , donut = true
        , title = false
        , growOnHover = true
        , titleOffset = 0
        , labelSunbeamLayout = false
        , startAngle = false
        , padAngle = false
        , endAngle = false
        , cornerRadius = 0
        , donutRatio = 0.5
        , val = {start: 0, end: 0}
        , arcsRadius = []
        , dispatch = d3.dispatch('chartClick', 'elementClick', 'elementDblClick', 'elementMouseover', 'elementMouseout', 'elementMousemove', 'renderEnd')
        ;

    //============================================================
    // chart function
    //------------------------------------------------------------

    var renderWatch = nv.utils.renderWatch(dispatch);

    function chart(selection) {
        renderWatch.reset();
        selection.each(function (data) {

            //console.log( data );
            var availableWidth = width - margin.left - margin.right
                , availableHeight = height - margin.top - margin.bottom
                , radius = Math.min(availableWidth, availableHeight) / 2
                ;

            container = d3.select(this);

            var outer = radius - 10;
            var inner = outer - 5;

            nv.utils.initSVG(container);

            // Setup containers and skeleton of chart
            var wrap = container.selectAll('.nv-wrap.nv-gauge').data([data]);
            var wrapEnter = wrap.enter().append('g').attr('class', 'nvd3 nv-wrap nv-gauge nv-chart-' + id);
            var gEnter = wrapEnter.append('g');
            var g = wrap.select('g');
            var g_gauge = gEnter.append('g').attr('class', 'nv-gauge');
            //gEnter.append('g').attr('class', 'nv-gaugeLabels');

            //var gValueEnter = gEnter.append('g').attr('class', 'nv-gaugeValue');
            //gValueEnter.append('path').attr('class', 'nv-gaugeValue-path').each(function(d) {
            //    this._current = d;
            //});;

            var gInfoEnter = gEnter.append('g').attr('class', 'nv-gaugeInfo');
            gInfoEnter.append('g').classed('key', true).append('text');
            gInfoEnter.append('g').classed('value', true).append('text');
            gInfoEnter.append('g').classed('icon', true).append('path');

            wrap.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
            g.select('.nv-gauge').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');
            g.select('.nv-gaugeInfo').attr('transform', 'translate(' + availableWidth / 2 + ',' + availableHeight / 2 + ')');

            //
            container.on('click', function (d, i) {
                dispatch.chartClick({
                    data: d,
                    index: i,
                    pos: d3.event,
                    id: id
                });
            });

            //console.log(data);

            var thresholds = data.filter(function (d) {
                return getThreshold(d);
            }).sort(function (a, b) {
                    return d3.ascending(getY(a), getY(b));
                });

            thresholds
                .forEach(function (d, i) {
                    d.prevValue = i > 0 ? getY(thresholds[i - 1]) : 0;
                });

            //console.log(data);

            var arc = d3.svg.arc().outerRadius(outer);
            var arcOver = d3.svg.arc().outerRadius(outer + 5);

            if (startAngle !== false) {
                arc.startAngle(startAngle);
                arcOver.startAngle(startAngle);
            }

            if (endAngle !== false) {
                arc.endAngle(endAngle);
                arcOver.endAngle(endAngle);
            }
            if (donut) {
                arc.innerRadius(inner);
                arcOver.innerRadius(inner);
            }

            if (arc.cornerRadius && cornerRadius) {
                arc.cornerRadius(cornerRadius);
                arcOver.cornerRadius(cornerRadius);
            }

            // Setup the gauge chart and choose the data element
            var gaugeData = d3.layout.pie()
                .sort(null)
                .value(function (d, i) {
                    return getThreshold(d) ? (getY(d) - d.prevValue) : getY(d);
                });

            // padAngle added in d3 3.5
            if (gaugeData.padAngle && padAngle) {
                gaugeData.padAngle(padAngle);
            }

            // if title is specified and donut, put it in the middle
            if (donut && title) {
                g_gauge.append("text").attr('class', 'nv-gauge-title');

                wrap.select('.nv-gauge-title')
                    .style("text-anchor", "middle")
                    .text(function (d) {
                        return title;
                    })
                    .style("font-size", (Math.min(availableWidth, availableHeight)) * donutRatio * 2 / (title.length + 2) + "px")
                    .attr("dy", "0.35em") // trick to vertically center text
                    .attr('transform', function (d, i) {
                        return 'translate(0, ' + titleOffset + ')';
                    });
            }

            var slices = wrap.select('.nv-gauge').selectAll('.nv-slice').data(gaugeData);
            var gaugeInfo = wrap.select('.nv-gaugeInfo').datum(gaugeData);

            slices.exit().remove();

            var ae = slices.enter().append('g');
            ae.attr('class', 'nv-slice');
            ae.on('mouseover', function (d, i) {

                if (!getThreshold(d.data))
                    return;

                d3.select(this).classed('hover', true);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(70)
                        .attr("d", arcOver);
                }

                if (donut) {
                    gaugeInfo.select('.key text').text(getX(d.data));
                    gaugeInfo.select('.value text').text(valueFormat(getY(d.data)));
                }

                dispatch.elementMouseover({
                    data: d.data,
                    index: i,
                    color: d3.select(this).style("fill"),
                    element: this
                });
            });
            ae.on('mouseout', function (d, i) {
                if (!getThreshold(d.data))
                    return;

                d3.select(this).classed('hover', false);
                if (growOnHover) {
                    d3.select(this).select("path").transition()
                        .duration(50)
                        .attr("d", arc);
                }

                donutInfo();

                dispatch.elementMouseout({data: d.data, index: i, element: this});
            });
            ae.on('mousemove', function (d, i) {
                if (!getThreshold(d.data))
                    return;

                dispatch.elementMousemove({data: d.data, index: i, element: this});
            });

            slices.attr('fill', function (d, i) {
                return color(d.data, i);
            });
            slices.attr('stroke', function (d, i) {
                return color(d.data, i);
            });

            var paths = ae.append('path').attr('class', 'nv-slice-path').each(function (d) {
                this._current = d;
            });

            /*
             if ( showChecks ) {
             ae.append('path').attr('class', 'nv-check')
             .attr('d', 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z');
             }

             slices.classed('selected', function(d){ return d.value > 0 && d.data.selected; })
             */

            donutInfo();

            function donutInfo() {
                if (donut) {
                    /*
                     var gaugeData = gaugeInfo.datum(),
                     selected = gaugeData.filter(function(d){ return d.data.selected;}),
                     sum = d3.sum( selected, function(d){ return d.value;});

                     */
                    var val = gaugeInfo.datum().filter(function (d) {
                        return !getThreshold(d.data);
                    });

                    val = val && val.length > 0 ? val[0].data : null;

                    if ( val ) {

                        var thresholds = icon(getY(val), data.filter(function (d) {
                            return getThreshold(d);
                        }));

                        gaugeInfo.select('.key text').text(thresholds || getX(val));
                        gaugeInfo.select('.value text').text(valueFormat(getY(val)));

                        if (thresholds) {
                            gaugeInfo.select('.icon path')
                                .attr("d", "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z");
                            //console.log(thresholds)
                            gaugeInfo.select('.icon')
                                .attr('class', 'icon ' + thresholds);
                        }
                    }
                    else {
                        gaugeInfo.select('.key text').text('');
                        gaugeInfo.select('.value text').text(valueFormat(0));

                    }
                }
            }


            var arcValue = d3.svg.arc()
                .innerRadius(inner - 2)
                .outerRadius(inner - 28);

            if (startAngle !== false) {
                arcValue.startAngle(startAngle);
            }
            if (endAngle !== false) {
                arcValue.endAngle(endAngle);
            }
            /*
             if (donut) {
             arcValue.innerRadius(donutRatio * radius);
             }
             */

            /*
             if (arcValue.cornerRadius && cornerRadius) {
             arcValue.cornerRadius(cornerRadius);
             }
             */

            /*
             gaugeValue
             .attr('fill', function(d,i) { return color(d, i); })
             .attr('stroke', function(d,i) { return color(d, i); });
             */

            /*
             gaugeValue.select('path')
             .transition()
             .duration(500)
             .attr("d", function (d, i) { return arcValue(d); })
             .attrTween("d", arcTween);
             */


            slices.select('path.nv-slice-path')
                .filter(function (d) {
                    return getThreshold(d.data);
                })
                .transition()
                .attr("d", arc);

            slices.select('path.nv-slice-path')
                .filter(function (d) {
                    return !getThreshold(d.data);
                })
                .transition()
                .duration(500)
                .attr("d", arcValue)
                .attrTween("d", arcTween);

            function arcTween(a, idx) {
                //console.log('arcTween', a );
                a.endAngle = isNaN(a.endAngle) ? 0 : a.endAngle;
                a.startAngle = 0;

                //if (!donut) a.innerRadius = 0;
                var i = d3.interpolate(this._current, a);
                this._current = i(0);
                return function (t) {
                    return arcValue(i(t));
                };
            }
        });

        renderWatch.renderEnd('gauge immediate');
        return chart;
    }

    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------

    chart.dispatch = dispatch;
    chart.options = nv.utils.optionsFunc.bind(chart);

    chart._options = Object.create({}, {
        // simple options, just get/set the necessary values
        arcsRadius: {
            get: function () {
                return arcsRadius;
            }, set: function (_) {
                arcsRadius = _;
            }
        },
        value: {
            get: function () {
                return val;
            }, set: function (_) {
                val = _;
            }
        },
        width: {
            get: function () {
                return width;
            }, set: function (_) {
                width = _;
            }
        },
        height: {
            get: function () {
                return height;
            }, set: function (_) {
                height = _;
            }
        },
        //showChecks: {get: function(){return showChecks;}, set: function(_){showChecks=_;}},
        //showLabels: {get: function(){return showLabels;}, set: function(_){showLabels=_;}},
        title: {
            get: function () {
                return title;
            }, set: function (_) {
                title = _;
            }
        },
        titleOffset: {
            get: function () {
                return titleOffset;
            }, set: function (_) {
                titleOffset = _;
            }
        },
        //labelThreshold: {get: function(){return labelThreshold;}, set: function(_){labelThreshold=_;}},
        valueFormat: {
            get: function () {
                return valueFormat;
            }, set: function (_) {
                valueFormat = _;
            }
        },
        x: {
            get: function () {
                return getX;
            }, set: function (_) {
                getX = _;
            }
        },
        id: {
            get: function () {
                return id;
            }, set: function (_) {
                id = _;
            }
        },
        endAngle: {
            get: function () {
                return endAngle;
            }, set: function (_) {
                endAngle = _;
            }
        },
        startAngle: {
            get: function () {
                return startAngle;
            }, set: function (_) {
                startAngle = _;
            }
        },
        padAngle: {
            get: function () {
                return padAngle;
            }, set: function (_) {
                padAngle = _;
            }
        },
        cornerRadius: {
            get: function () {
                return cornerRadius;
            }, set: function (_) {
                cornerRadius = _;
            }
        },
        donutRatio: {
            get: function () {
                return donutRatio;
            }, set: function (_) {
                donutRatio = _;
            }
        },
        //labelsOutside: {get: function(){return labelsOutside;}, set: function(_){labelsOutside=_;}},
        //labelSunbeamLayout: {get: function(){return labelSunbeamLayout;}, set: function(_){labelSunbeamLayout=_;}},
        //donut:              {get: function(){return donut;}, set: function(_){donut=_;}},
        growOnHover: {
            get: function () {
                return growOnHover;
            }, set: function (_) {
                growOnHover = _;
            }
        },

        // depreciated after 1.7.1
        //gaugeLabelsOutside: {get: function(){return labelsOutside;}, set: function(_){
        //    labelsOutside=_;
        //    nv.deprecated('gaugeLabelsOutside', 'use labelsOutside instead');
        //}},
        //// depreciated after 1.7.1
        //donutLabelsOutside: {get: function(){return labelsOutside;}, set: function(_){
        //    labelsOutside=_;
        //    nv.deprecated('donutLabelsOutside', 'use labelsOutside instead');
        //}},
        // deprecated after 1.7.1
        //labelFormat: {get: function(){ return valueFormat;}, set: function(_) {
        //    valueFormat=_;
        //    nv.deprecated('labelFormat','use valueFormat instead');
        //}},

        // options that require extra logic in the setter
        margin: {
            get: function () {
                return margin;
            }, set: function (_) {
                margin.top = typeof _.top != 'undefined' ? _.top : margin.top;
                margin.right = typeof _.right != 'undefined' ? _.right : margin.right;
                margin.bottom = typeof _.bottom != 'undefined' ? _.bottom : margin.bottom;
                margin.left = typeof _.left != 'undefined' ? _.left : margin.left;
            }
        },
        y: {
            get: function () {
                return getY;
            }, set: function (_) {
                getY = d3.functor(_);
            }
        },
        threshold: {
            get: function () {
                return getThreshold;
            }, set: function (_) {
                getThreshold = d3.functor(_);
            }
        },
        icon: {
            get: function () {
                return icon;
            }, set: function (_) {
                icon = d3.functor(_);
            }
        },
        color: {
            get: function () {
                return color;
            }, set: function (_) {
                color = nv.utils.getColor(_);
            }
        }/*,
         labelType:          {get: function(){return labelType;}, set: function(_){
         labelType= _ || 'key';
         }}*/
    });

    nv.utils.initOptions(chart);
    return chart;
};
