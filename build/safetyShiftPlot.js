(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined'
        ? (module.exports = factory(require('webcharts'), require('d3')))
        : typeof define === 'function' && define.amd
            ? define(['webcharts', 'd3'], factory)
            : (global.safetyShiftPlot = factory(global.webCharts, global.d3));
})(this, function(webcharts, d3) {
    'use strict';

    if (typeof Object.assign != 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, 'assign', {
            value: function assign(target, varArgs) {
                // .length of function is 2
                'use strict';

                if (target == null) {
                    // TypeError if undefined or null
                    throw new TypeError('Cannot convert undefined or null to object');
                }

                var to = Object(target);

                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];

                    if (nextSource != null) {
                        // Skip over if undefined or null
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }

                return to;
            },
            writable: true,
            configurable: true
        });
    }

    if (!Array.prototype.find) {
        Object.defineProperty(Array.prototype, 'find', {
            value: function value(predicate) {
                // 1. Let O be ? ToObject(this value).
                if (this == null) {
                    throw new TypeError('"this" is null or not defined');
                }

                var o = Object(this);

                // 2. Let len be ? ToLength(? Get(O, 'length')).
                var len = o.length >>> 0;

                // 3. If IsCallable(predicate) is false, throw a TypeError exception.
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }

                // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
                var thisArg = arguments[1];

                // 5. Let k be 0.
                var k = 0;

                // 6. Repeat, while k < len
                while (k < len) {
                    // a. Let Pk be ! ToString(k).
                    // b. Let kValue be ? Get(O, Pk).
                    // c. Let testResult be ToBoolean(? Call(predicate, T, � kValue, k, O �)).
                    // d. If testResult is true, return kValue.
                    var kValue = o[k];
                    if (predicate.call(thisArg, kValue, k, o)) {
                        return kValue;
                    }
                    // e. Increase k by 1.
                    k++;
                }

                // 7. Return undefined.
                return undefined;
            }
        });
    }

    if (!Array.prototype.findIndex) {
        Object.defineProperty(Array.prototype, 'findIndex', {
            value: function value(predicate) {
                // 1. Let O be ? ToObject(this value).
                if (this == null) {
                    throw new TypeError('"this" is null or not defined');
                }

                var o = Object(this);

                // 2. Let len be ? ToLength(? Get(O, "length")).
                var len = o.length >>> 0;

                // 3. If IsCallable(predicate) is false, throw a TypeError exception.
                if (typeof predicate !== 'function') {
                    throw new TypeError('predicate must be a function');
                }

                // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
                var thisArg = arguments[1];

                // 5. Let k be 0.
                var k = 0;

                // 6. Repeat, while k < len
                while (k < len) {
                    // a. Let Pk be ! ToString(k).
                    // b. Let kValue be ? Get(O, Pk).
                    // c. Let testResult be ToBoolean(? Call(predicate, T, � kValue, k, O �)).
                    // d. If testResult is true, return k.
                    var kValue = o[k];
                    if (predicate.call(thisArg, kValue, k, o)) {
                        return k;
                    }
                    // e. Increase k by 1.
                    k++;
                }

                // 7. Return -1.
                return -1;
            }
        });
    }

    var rendererSpecificSettings = {
        id_col: 'USUBJID',
        time_col: 'VISIT',
        measure_col: 'TEST',
        value_col: 'STRESN',
        start_value: null,
        x_params: { visits: null, stat: 'mean' },
        y_params: { visits: null, stat: 'mean' },
        filters: null
    };

    var webchartsSettings = {
        x: {
            column: 'shiftx',
            type: 'linear',
            label: 'Baseline Value',
            format: '0.2f'
        },
        y: {
            column: 'shifty',
            type: 'linear',
            label: 'Comparison Value',
            behavior: 'flex',
            format: '0.2f'
        },
        marks: [
            {
                type: 'circle',
                per: ['key'],
                radius: 4,
                attributes: {
                    'stroke-width': 0.5,
                    'fill-opacity': 0.8
                },
                tooltip:
                    'Subject ID: [key]\nBaseline: [shiftx]\nComparison: [shifty]\nChange: [chg]\nPercent Change: [pchg]'
            }
        ],
        gridlines: 'xy',
        resizable: false,
        margin: { right: 25, top: 25 },
        aspect: 1
    };

    var defaultSettings = Object.assign({}, rendererSpecificSettings, webchartsSettings);

    // Replicate settings in multiple places in the settings object
    function syncSettings(settings) {
        settings.measure = settings.start_value;
        return settings;
    }

    // Default Control objects
    var controlInputs = [
        { type: 'dropdown', values: [], label: 'Measure', option: 'measure', require: true },
        {
            type: 'dropdown',
            values: [],
            label: 'Baseline visit(s)',
            option: 'x_params_visits',
            require: true,
            multiple: true
        },
        {
            type: 'dropdown',
            values: [],
            label: 'Comparison visit(s)',
            option: 'y_params_visits',
            require: true,
            multiple: true
        }
    ];

    // Map values from settings to control inputs
    function syncControlInputs(controlInputs, settings) {
        //Define filter objects.
        if (Array.isArray(settings.filters) && settings.filters.length)
            settings.filters = settings.filters.map(function(filter) {
                var filterObject = {
                    value_col: filter.value_col || filter
                };
                filterObject.label = filter.label || filterObject.value_col;
                filterObject.type = 'subsetter';

                if (filter instanceof Object) Object.assign(filterObject, filter);

                return filterObject;
            });
        else delete settings.filters;

        return controlInputs;
    }

    var listingSettings = {
        cols: ['key', 'shiftx', 'shifty', 'chg', 'pchg'],
        headers: ['Subject ID', 'Baseline Value', 'Comparison Value', 'Change', 'Percent Change']
    };

    var _typeof =
        typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
            ? function(obj) {
                  return typeof obj;
              }
            : function(obj) {
                  return obj &&
                      typeof Symbol === 'function' &&
                      obj.constructor === Symbol &&
                      obj !== Symbol.prototype
                      ? 'symbol'
                      : typeof obj;
              };

    var asyncGenerator = (function() {
        function AwaitValue(value) {
            this.value = value;
        }

        function AsyncGenerator(gen) {
            var front, back;

            function send(key, arg) {
                return new Promise(function(resolve, reject) {
                    var request = {
                        key: key,
                        arg: arg,
                        resolve: resolve,
                        reject: reject,
                        next: null
                    };

                    if (back) {
                        back = back.next = request;
                    } else {
                        front = back = request;
                        resume(key, arg);
                    }
                });
            }

            function resume(key, arg) {
                try {
                    var result = gen[key](arg);
                    var value = result.value;

                    if (value instanceof AwaitValue) {
                        Promise.resolve(value.value).then(
                            function(arg) {
                                resume('next', arg);
                            },
                            function(arg) {
                                resume('throw', arg);
                            }
                        );
                    } else {
                        settle(result.done ? 'return' : 'normal', result.value);
                    }
                } catch (err) {
                    settle('throw', err);
                }
            }

            function settle(type, value) {
                switch (type) {
                    case 'return':
                        front.resolve({
                            value: value,
                            done: true
                        });
                        break;

                    case 'throw':
                        front.reject(value);
                        break;

                    default:
                        front.resolve({
                            value: value,
                            done: false
                        });
                        break;
                }

                front = front.next;

                if (front) {
                    resume(front.key, front.arg);
                } else {
                    back = null;
                }
            }

            this._invoke = send;

            if (typeof gen.return !== 'function') {
                this.return = undefined;
            }
        }

        if (typeof Symbol === 'function' && Symbol.asyncIterator) {
            AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
                return this;
            };
        }

        AsyncGenerator.prototype.next = function(arg) {
            return this._invoke('next', arg);
        };

        AsyncGenerator.prototype.throw = function(arg) {
            return this._invoke('throw', arg);
        };

        AsyncGenerator.prototype.return = function(arg) {
            return this._invoke('return', arg);
        };

        return {
            wrap: function(fn) {
                return function() {
                    return new AsyncGenerator(fn.apply(this, arguments));
                };
            },
            await: function(value) {
                return new AwaitValue(value);
            }
        };
    })();

    function clone(obj) {
        var copy;

        //boolean, number, string, null, undefined
        if ('object' != (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) || null == obj)
            return obj;

        //date
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }

        //array
        if (obj instanceof Array) {
            copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = clone(obj[i]);
            }
            return copy;
        }

        //object
        if (obj instanceof Object) {
            copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
            }
            return copy;
        }

        throw new Error('Unable to copy [obj]! Its type is not supported.');
    }

    function checkFilters() {
        var _this = this;

        if (this.config.filters)
            this.config.filters = this.config.filters.filter(function(filter) {
                var variableExists = _this.raw_data[0].hasOwnProperty(filter.value_col);
                var nLevels = d3
                    .set(
                        _this.raw_data.map(function(d) {
                            return d[filter.value_col];
                        })
                    )
                    .values().length;

                if (!variableExists)
                    console.warn(
                        ' The [ ' +
                            filter.label +
                            ' ] filter has been removed because the variable does not exist.'
                    );
                else if (nLevels < 2)
                    console.warn(
                        'The [ ' +
                            filter.label +
                            ' ] filter has been removed because the variable has only one level.'
                    );

                return variableExists && nLevels > 1;
            });
    }

    function preprocessData(rawData) {
        var config = this.config;

        var nested = d3
            .nest()
            .key(function(d) {
                return d[config.id_col];
            })
            .key(function(d) {
                return d[config.time_col];
            })
            .key(function(d) {
                return d[config.measure_col];
            })
            .rollup(function(r) {
                var value = r[0][config.value_col];
                return { value: value, raw: r[0] };
            })
            .entries(rawData);

        function getMean(arr) {
            return d3.sum(arr) / arr.length;
        }

        function setVal(e, params) {
            var visits = e.values.filter(function(f) {
                return params.visits.indexOf(f.key) !== -1;
            });
            var measures = visits.length
                ? d3.merge(
                      visits.map(function(m) {
                          return m.values
                              .filter(function(f) {
                                  return f.key === config.measure;
                              })
                              .map(function(p) {
                                  return +p.values.value;
                              });
                      })
                  )
                : [];

            var meas = null;
            var stat = measures && measures.length > 1 ? params.stat : 'def';
            var something = {
                mean: getMean(measures),
                max: d3.max(measures),
                min: d3.min(measures),
                def: measures[0]
            };
            meas = something[stat];
            return meas;
        }

        function getXY(e) {
            e.shiftx = +setVal(e, config.x_params);
            e.shifty = +setVal(e, config.y_params);
            e.chg = e.shifty - e.shiftx;
            e.pchg = d3.format('%')(e.chg / e.shiftx);
        }

        function getChange(e) {
            e.shifty -= +e.shiftx;
        }

        //flatten out other columns specified for details
        function getOther(e) {
            config.details.forEach(function(g) {
                e[g.col] = e.values[0].values[0].values.raw[g.col];
            });
        }

        config.details = config.details && config.details.length ? config.details : [];

        if (config.color_by) {
            var match = config.details.filter(function(f) {
                return f.col === config.color_by;
            });
            if (!match[0]) config.details.push({ col: config.color_by, label: config.color_by });
        }

        var test_data = nested;
        test_data.forEach(getXY);
        if (config.change) test_data.forEach(getChange);
        if (config.details.length) test_data.forEach(getOther);

        return test_data;
    }

    function onInit() {
        var _this = this;

        var config = this.config;

        // Remove filters for variables with 0 or 1 levels
        checkFilters.call(this);
        this.allData = this.raw_data;
        this.allData.forEach(function(d) {
            d[config.measure_col] = d[config.measure_col].trim();
        });

        //Get list of numeric measures.
        this.config.measures = d3
            .set(
                this.allData.map(function(d) {
                    return d[config.measure_col];
                })
            )
            .values()
            .filter(function(measure) {
                var measureValues = _this.allData
                    .filter(function(d) {
                        return d[config.measure_col] === measure;
                    })
                    .map(function(d) {
                        return { value: d[config.value_col] };
                    });

                return webcharts.dataOps.getValType(measureValues, 'value') === 'continuous';
            });
        this.config.measure = this.config.measure || this.config.measures[0];

        //Get list of visits.
        this.config.visits = d3
            .set(
                this.allData.map(function(d) {
                    return d[config.time_col];
                })
            )
            .values()
            .filter(function(d) {
                return !!d;
            })
            .sort(webcharts.dataOps.naturalSorter);
        this.config.x_params.visits = this.config.x_params.visits || [this.config.visits[0]]; // set baseline visit(s)
        this.config.y_params.visits = this.config.y_params.visits || this.config.visits.slice(1); // set comparison visit(s)

        //Define initial shift plot data.
        this.measureData = this.allData.filter(function(d) {
            return d[_this.config.measure_col] === _this.config.measure;
        }); // raw data for a specific measure
        this.filteredData = this.measureData; // filtered data placeholder
        this.raw_data = preprocessData.call(this, this.measureData); // preprocessed measure data
        this.config.x.domain = d3.extent(
            this.raw_data.map(function(d) {
                return d.shiftx;
            })
        );
        this.config.y.domain = d3.extent(
            this.raw_data.map(function(d) {
                return d.shifty;
            })
        );
    }

    function custmoizeMeasureControl() {
        var _this = this;

        var measureSelect = this.controls.wrap
            .selectAll('.control-group')
            .filter(function(f) {
                return f.option === 'measure';
            })
            .select('select');
        measureSelect.on('change', function() {
            _this.config.measure = measureSelect.select('option:checked').property('text');

            //Redefine raw and preprocessed measure data, x-domain, and y-domain.
            _this.measureData = _this.allData.filter(function(d) {
                return d[_this.config.measure_col] === _this.config.measure;
            });
            _this.raw_data = preprocessData.call(_this, _this.measureData);
            _this.config.x.domain = d3.extent(
                _this.raw_data.map(function(d) {
                    return d.shiftx;
                })
            );
            _this.config.y.domain = d3.extent(
                _this.raw_data.map(function(d) {
                    return d.shifty;
                })
            );

            //Redefine and preprocess filtered data and redraw chart.
            if (_this.config.filters) {
                _this.filteredData = _this.measureData.filter(function(d) {
                    var filtered = false;
                    _this.config.filters.forEach(function(filter) {
                        return (filtered =
                            filtered === false && filter.value !== 'All'
                                ? d[filter.value_col] !== filter.value
                                : filtered);
                    });
                    return !filtered;
                });
                var filteredPreprocessedData = preprocessData.call(_this, _this.filteredData);
                _this.draw(filteredPreprocessedData);
            } else {
                _this.filteredData = _this.measureData;
                _this.draw(_this.raw_data);
            }
        });
    }

    function customizeBaselineControl() {
        var _this = this;

        var baselineSelect = this.controls.wrap
            .selectAll('.control-group')
            .filter(function(f) {
                return f.option === 'x_params_visits';
            })
            .select('select');
        baselineSelect
            .selectAll('option')
            .filter(function(f) {
                return _this.config.x_params.visits.indexOf(f) > -1;
            })
            .attr('selected', 'selected');
        baselineSelect.on('change', function() {
            _this.config.x_params.visits = baselineSelect.selectAll('option:checked').data();

            //Redefine preprocessed measure data and x-domain.
            _this.raw_data = preprocessData.call(_this, _this.measureData);
            _this.config.x.domain = d3.extent(
                _this.raw_data.map(function(d) {
                    return d.shiftx;
                })
            );

            //Preprocess filtered data and redraw chart.
            if (_this.config.filters) {
                var filteredPreprocessedData = preprocessData.call(_this, _this.filteredData);
                _this.draw(filteredPreprocessedData);
            } else _this.draw(_this.raw_data);
        });
    }

    function customizeComparisonControl() {
        var _this = this;

        var comparisonSelect = this.controls.wrap
            .selectAll('.control-group')
            .filter(function(f) {
                return f.option === 'y_params_visits';
            })
            .select('select');
        comparisonSelect
            .selectAll('option')
            .filter(function(f) {
                return _this.config.y_params.visits.indexOf(f) > -1;
            })
            .attr('selected', 'selected');
        comparisonSelect.on('change', function() {
            _this.config.y_params.visits = comparisonSelect.selectAll('option:checked').data();

            //Redefine preprocessed measure data and y-domain.
            _this.raw_data = preprocessData.call(_this, _this.measureData);
            _this.config.y.domain = d3.extent(
                _this.raw_data.map(function(d) {
                    return d.shifty;
                })
            );

            //Preprocess filtered data and redraw chart.
            if (_this.config.filters) {
                var filteredPreprocessedData = preprocessData.call(_this, _this.filteredData);
                _this.draw(filteredPreprocessedData);
            } else _this.draw(_this.raw_data);
        });
    }

    function addFilters(chart) {
        chart.config.filters.forEach(function(filter) {
            //Capture distinct [filter.value_col] values.
            filter.values = d3
                .set(
                    chart.allData.map(function(d) {
                        return d[filter.value_col];
                    })
                )
                .values();
            filter.value = 'All';

            //Attach filter to the DOM.
            var controlGroup = chart.controls.wrap
                .append('div')
                .classed('control-group', true)
                .datum(filter);
            controlGroup
                .append('span')
                .classed('wc-control-label', true)
                .text(filter.label);
            var changer = controlGroup.append('select').classed('changer', true);

            //Attach distinct [filter.value_col] values as select options.
            changer
                .selectAll('option')
                .data(['All'].concat(filter.values))
                .enter()
                .append('option')
                .text(function(d) {
                    return d;
                });

            //Define dropdown event listener.
            changer.on('change', function(d) {
                //Set [filter.value] to dropdown selection.
                filter.value = changer.select('option:checked').property('text');

                //Filter raw measure data on all filter selections.
                chart.filteredData = chart.measureData.filter(function(di) {
                    var filtered = false;
                    chart.config.filters.forEach(function(dii) {
                        return (filtered =
                            filtered === false && dii.value !== 'All'
                                ? di[dii.value_col] !== dii.value
                                : filtered);
                    });
                    return !filtered;
                });

                //Preprocess filtered data and redraw chart.
                var preprocessedFilteredData = preprocessData.call(chart, chart.filteredData);
                chart.draw(preprocessedFilteredData);
            });
        });
    }

    function onLayout() {
        //Add header element in which to list visits at which measure is captured.
        this.wrap.append('p', 'svg').attr('class', 'possible-visits');

        //Designate chart container for brushing.
        this.wrap.classed('brushable', true);

        //Add footnote element.
        this.wrap
            .append('p')
            .attr('class', 'record-note')
            .text('Click and drag to select points');

        //Update the dropdown options
        this.controls.config.inputs.filter(function(input) {
            return input.option === 'measure';
        })[0].values = this.config.measures;
        this.controls.config.inputs.filter(function(input) {
            return input.option === 'x_params_visits';
        })[0].values = this.config.visits;
        this.controls.config.inputs.filter(function(input) {
            return input.option === 'y_params_visits';
        })[0].values = this.config.visits;
        //Force controls to be redrawn.
        this.controls.layout();

        //Customize measure, baseline, and comparison controls.
        custmoizeMeasureControl.call(this);
        customizeBaselineControl.call(this);
        customizeComparisonControl.call(this);

        //Create custom filters.
        if (this.config.filters) addFilters(this);

        //Add element for participant counts.
        this.controls.wrap
            .append('em')
            .classed('annote', true)
            .style('display', 'block');
    }

    function onPreprocess() {}

    function onDataTransform() {}

    /*------------------------------------------------------------------------------------------------\
  Annotate number of participants based on current filters, number of participants in all, and
  the corresponding percentage.

  Inputs:

    chart - a webcharts chart object
    id_unit - a text string to label the units in the annotation (default = 'participants')
    selector - css selector for the annotation
\------------------------------------------------------------------------------------------------*/

    function updateParticipantCount(chart, selector, id_unit) {
        //count the number of unique ids in the data set
        var totalObs = d3
            .set(
                chart.allData.map(function(d) {
                    return d[chart.config.id_col];
                })
            )
            .values().length;

        //count the number of unique ids in the current chart and calculate the percentage
        var currentObs = chart.filtered_data.filter(function(d) {
            return (
                chart.x.domain()[0] <= d.shiftx &&
                d.shiftx <= chart.x.domain()[1] &&
                chart.y.domain()[0] <= d.shifty &&
                d.shifty <= chart.y.domain()[1]
            );
        }).length;

        var percentage = d3.format('0.1%')(currentObs / totalObs);

        //clear the annotation
        var annotation = d3.select(selector);
        annotation.selectAll('*').remove();

        //update the annotation
        var units = id_unit ? ' ' + id_unit : ' participant(s)';
        annotation.text(currentObs + ' of ' + totalObs + units + ' shown (' + percentage + ')');
    }

    function resetListing() {
        this.listing.draw([]);
        this.listing.wrap.style('display', 'none');
    }

    function onDraw() {
        //Annotate selected and total number of participants.
        updateParticipantCount(this, '.annote');

        //Reset listing.
        resetListing.call(this);
    }

    function addBoxPlot(
        svg$$1,
        results,
        height,
        width,
        domain,
        boxPlotWidth,
        boxColor,
        boxInsideColor,
        fmt,
        horizontal
    ) {
        //set default orientation to "horizontal"
        var horizontal = horizontal == undefined ? true : horizontal;

        //make the results numeric and sort
        var results = results
            .map(function(d) {
                return +d;
            })
            .sort(d3.ascending);

        //set up scales
        var y = d3.scale.linear().range([height, 0]);

        var x = d3.scale.linear().range([0, width]);

        if (horizontal) {
            y.domain(domain);
        } else {
            x.domain(domain);
        }

        var probs = [0.05, 0.25, 0.5, 0.75, 0.95];
        for (var i = 0; i < probs.length; i++) {
            probs[i] = d3.quantile(results, probs[i]);
        }

        var boxplot = svg$$1
            .append('g')
            .attr('class', 'boxplot')
            .datum({ values: results, probs: probs });

        //set bar width variable
        var box_x = horizontal ? x(0.5 - boxPlotWidth / 2) : x(probs[1]);
        var box_width = horizontal
            ? x(0.5 + boxPlotWidth / 2) - x(0.5 - boxPlotWidth / 2)
            : x(probs[3]) - x(probs[1]);
        var box_y = horizontal ? y(probs[3]) : y(0.5 + boxPlotWidth / 2);
        var box_height = horizontal
            ? -y(probs[3]) + y(probs[1])
            : y(0.5 - boxPlotWidth / 2) - y(0.5 + boxPlotWidth / 2);

        boxplot
            .append('rect')
            .attr('class', 'boxplot fill')
            .attr('x', box_x)
            .attr('width', box_width)
            .attr('y', box_y)
            .attr('height', box_height)
            .style('fill', boxColor);

        //draw dividing lines at median, 95% and 5%
        var iS = [0, 2, 4];
        var iSclass = ['', 'median', ''];
        var iSColor = [boxColor, boxInsideColor, boxColor];
        for (var i = 0; i < iS.length; i++) {
            boxplot
                .append('line')
                .attr('class', 'boxplot ' + iSclass[i])
                .attr('x1', horizontal ? x(0.5 - boxPlotWidth / 2) : x(probs[iS[i]]))
                .attr('x2', horizontal ? x(0.5 + boxPlotWidth / 2) : x(probs[iS[i]]))
                .attr('y1', horizontal ? y(probs[iS[i]]) : y(0.5 - boxPlotWidth / 2))
                .attr('y2', horizontal ? y(probs[iS[i]]) : y(0.5 + boxPlotWidth / 2))
                .style('fill', iSColor[i])
                .style('stroke', iSColor[i]);
        }

        //draw lines from 5% to 25% and from 75% to 95%
        var iS = [[0, 1], [3, 4]];
        for (var i = 0; i < iS.length; i++) {
            boxplot
                .append('line')
                .attr('class', 'boxplot')
                .attr('x1', horizontal ? x(0.5) : x(probs[iS[i][0]]))
                .attr('x2', horizontal ? x(0.5) : x(probs[iS[i][1]]))
                .attr('y1', horizontal ? y(probs[iS[i][0]]) : y(0.5))
                .attr('y2', horizontal ? y(probs[iS[i][1]]) : y(0.5))
                .style('stroke', boxColor);
        }

        boxplot
            .append('circle')
            .attr('class', 'boxplot mean')
            .attr('cx', horizontal ? x(0.5) : x(d3.mean(results)))
            .attr('cy', horizontal ? y(d3.mean(results)) : y(0.5))
            .attr('r', horizontal ? x(boxPlotWidth / 3) : y(1 - boxPlotWidth / 3))
            .style('fill', boxInsideColor)
            .style('stroke', boxColor);

        boxplot
            .append('circle')
            .attr('class', 'boxplot mean')
            .attr('cx', horizontal ? x(0.5) : x(d3.mean(results)))
            .attr('cy', horizontal ? y(d3.mean(results)) : y(0.5))
            .attr('r', horizontal ? x(boxPlotWidth / 6) : y(1 - boxPlotWidth / 6))
            .style('fill', boxColor)
            .style('stroke', 'None');

        var formatx = fmt ? d3.format(fmt) : d3.format('.2f');

        boxplot
            .selectAll('.boxplot')
            .append('title')
            .text(function(d) {
                return (
                    'N = ' +
                    d.values.length +
                    '\n' +
                    'Min = ' +
                    d3.min(d.values) +
                    '\n' +
                    '5th % = ' +
                    formatx(d3.quantile(d.values, 0.05)) +
                    '\n' +
                    'Q1 = ' +
                    formatx(d3.quantile(d.values, 0.25)) +
                    '\n' +
                    'Median = ' +
                    formatx(d3.median(d.values)) +
                    '\n' +
                    'Q3 = ' +
                    formatx(d3.quantile(d.values, 0.75)) +
                    '\n' +
                    '95th % = ' +
                    formatx(d3.quantile(d.values, 0.95)) +
                    '\n' +
                    'Max = ' +
                    d3.max(d.values) +
                    '\n' +
                    'Mean = ' +
                    formatx(d3.mean(d.values)) +
                    '\n' +
                    'StDev = ' +
                    formatx(d3.deviation(d.values))
                );
            });
    }

    function onResize() {
        var _this = this;

        var decim = d3.format('.2f');
        // Draw box plots
        this.svg.selectAll('g.boxplot').remove();

        // Y-axis box plot
        var yValues = this.current_data.map(function(d) {
            return d.values.y;
        });
        var ybox = this.svg.append('g').attr('class', 'yMargin');
        addBoxPlot(ybox, yValues, this.plot_height, 1, this.y_dom, 10, '#bbb', 'white');
        ybox
            .select('g.boxplot')
            .attr(
                'transform',
                'translate(' + (this.plot_width + this.config.margin.right / 2) + ',0)'
            );

        //X-axis box plot
        var xValues = this.current_data.map(function(d) {
            return d.values.x;
        });
        var xbox = this.svg.append('g').attr('class', 'xMargin');
        addBoxPlot(
            xbox, //svg element
            xValues, //values
            1, //height
            this.plot_width, //width
            this.x_dom, //domain
            10, //box plot width
            '#bbb', //box color
            'white', //detail color
            '0.2f', //format
            false // horizontal?
        );
        xbox
            .select('g.boxplot')
            .attr('transform', 'translate(0,' + -(this.config.margin.top / 2) + ')');

        //get list of visits
        var possibleVisits = d3
            .set(
                this.allData
                    .filter(function(f) {
                        return f[_this.config.measure_col] === _this.config.measure;
                    })
                    .map(function(d) {
                        return d[_this.config.time_col];
                    })
            )
            .values()
            .sort(webcharts.dataOps.naturalSorter);

        this.wrap
            .select('.possible-visits')
            .text(
                this.config.measure +
                    ' is collected at these visits: ' +
                    possibleVisits.join(', ') +
                    '.'
            );

        //Expand the domains a bit so that points on the edge are brushable
        this.x_dom[0] = this.x_dom[0] < 0 ? this.x_dom[0] * 1.01 : this.x_dom[0] * 0.99;
        this.x_dom[1] = this.x_dom[1] < 0 ? this.x_dom[1] * 0.99 : this.x_dom[1] * 1.01;
        this.y_dom[0] = this.y_dom[0] < 0 ? this.y_dom[0] * 1.01 : this.y_dom[0] * 0.99;
        this.y_dom[1] = this.y_dom[1] < 0 ? this.y_dom[1] * 0.99 : this.y_dom[1] * 1.01;

        //reset view
        this.svg
            .selectAll('g.point')
            .classed('selected', false)
            .select('circle')
            .style('fill', this.config.colors[0]);
        this.wrap.select('.record-note').text('Click and drag to select points.');

        //brushing
        function brushed() {
            var _this2 = this;

            var extent$$1 = brush.extent();
            var points = this.svg.selectAll('g.point').classed('selected', false);

            points.select('circle').attr('fill-opacity', 0);

            var selected_points = points
                .filter(function(d) {
                    var cx = _this2.x(+d.values.x);
                    var cy = _this2.y(+d.values.y);
                    return (
                        extent$$1[0][0] <= cx &&
                        cx <= extent$$1[1][0] &&
                        extent$$1[0][1] <= cy &&
                        cy <= extent$$1[1][1]
                    );
                })
                .classed('selected', true)
                .select('circle')
                .attr('fill-opacity', this.config.marks[0].attributes['fill-opacity']);

            //redraw the table with the new data
            var selected_data = selected_points.data().map(function(m) {
                return m.values.raw[0];
            });
            this.listing.draw(selected_data);
            if (selected_data.length === 0) this.listing.wrap.style('display', 'none');
            else this.listing.wrap.style('display', 'block');

            //footnote
            this.wrap
                .select('.record-note')
                .text('Details of ' + selected_data.length + ' selected points:');
            if (brush.empty()) {
                this.wrap.select('.record-note').text('Click and drag to select points');
                points
                    .select('circle')
                    .attr('fill-opacity', this.config.marks[0].attributes['fill-opacity']);
            }
        } //brushed

        var brush = d3.svg
            .brush()
            .x(d3.scale.identity().domain(this.x.range()))
            .y(d3.scale.identity().domain(this.y.range()))
            .on('brush', brushed.bind(this));

        this.svg.call(brush);

        this.svg.select('rect.extent').attr({
            'shape-rendering': 'crispEdges',
            'stroke-width': 1,
            stroke: '#ccc',
            'fill-opacity': 0.1
        });

        //add an equality line
        var chart = this;

        var overallMin = d3.min([chart.x.domain()[0], chart.y.domain()[0]]);
        var overallMax = d3.max([chart.x.domain()[1], chart.y.domain()[1]]);

        this.svg.select('line.identity').remove();
        this.svg
            .append('line')
            .attr('x1', chart.x(overallMin))
            .attr('x2', chart.x(overallMax))
            .attr('y1', chart.y(overallMin))
            .attr('y2', chart.y(overallMax))
            .attr('stroke', 'black')
            .attr('clip-path', 'URL(#1)')
            .attr('class', 'identity');

        //Add tooltip to axis labels listing selected visits.
        this.svg
            .selectAll('.x.axis .axis-title')
            .append('title')
            .html(
                'Baseline visit(s):<br>&nbsp;&nbsp;&nbsp;&nbsp;' +
                    this.config.x_params.visits.join('<br>&nbsp;&nbsp;&nbsp;&nbsp;')
            );
        this.svg
            .selectAll('.y.axis .axis-title')
            .append('title')
            .html(
                'Comparison visit(s):<br>&nbsp;&nbsp;&nbsp;&nbsp;' +
                    this.config.y_params.visits.join('<br>&nbsp;&nbsp;&nbsp;&nbsp;')
            );
    }

    //polyfills
    //settings
    //webcharts
    //chart callbacks
    function safetyShiftPlot(element, settings) {
        //settings
        var mergedSettings = Object.assign({}, clone(defaultSettings), clone(settings));
        var syncedSettings = syncSettings(clone(mergedSettings));
        var syncedControlInputs = syncControlInputs(clone(controlInputs), syncedSettings);

        //controls
        var controls = webcharts.createControls(element, {
            location: 'top',
            inputs: syncedControlInputs
        });

        //chart
        var chart = webcharts.createChart(element, syncedSettings, controls);
        chart.on('init', onInit);
        chart.on('layout', onLayout);
        chart.on('preprocess', onPreprocess);
        chart.on('datatransform', onDataTransform);
        chart.on('draw', onDraw);
        chart.on('resize', onResize);

        //listing
        var listing = webcharts.createTable(element, listingSettings);
        listing.init([]);
        chart.listing = listing;

        return chart;
    }

    return safetyShiftPlot;
});
