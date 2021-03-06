The most straightforward way to customize a Safety Shift Plot is by using a configuration object whose properties describe the chart's behavior and appearance. Since the Safety Shift Plot is a Webcharts `chart` object, many default Webcharts settings are set in the [defaultSettings.js file](https://github.com/RhoInc/safety-shift-plot/blob/master/src/default-settings.js) as [described below](#Webcharts-Settings). Refer to the [Webcharts documentation](https://github.com/RhoInc/Webcharts/wiki/Chart-Configuration) for more details on these settings.

In addition to the standard Webcharts settings several custom settings not available in the base Webcharts library have been added to the Safety Shift Plot to facilitate data mapping and other custom functionality. These custom settings are described in detail below. All defaults can be overwritten by users.

# Renderer-specific settings
The sections below describe each safety-shift-plot setting as of version 2.1.0.

## settings.id_col
`string`

unique identifier variable name

**default:** `"USUBJID"`



## settings.time_col
`string`

visit variable name

**default:** `"VISIT"`



## settings.measure_col
`string`

measure variable name

**default:** `"TEST"`



## settings.unit_col
`string`

measure unit variable name

**default:** `"STRESU"`



## settings.value_col
`string`

result variable name

**default:** `"STRESN"`



## settings.start_value
`string`

value of measure to display initially

**default:** none



## settings.x_params
`object`

an object that defines the baseline value

### settings.x_params.visits
`array`

Baseline Visits

**default:** none

### settings.x_params.stat
`string`

Baseline Statistic

**default:** `"mean"`



## settings.y_params
`object`

an object that defines the comparison (or post-baseline) value

### settings.y_params.visits
`array`

Comparison Visits

**default:** none

### settings.y_params.stat
`string`

Comparison Statistic

**default:** `"mean"`



## settings.filters
`array`

an array of filter variables and associated metadata

**default:** none

### settings.filters[].value_col
`string`

Variable Name

**default:** none

### settings.filters[].label
`string`

Variable Label

**default:** none

# Webcharts settings
The object below contains each Webcharts setting as of version 2.1.0.

```
{    x: {        column: 'shiftx',        type: 'linear',        label: 'Baseline Value',        format: '0.2f'    },    y: {        column: 'shifty',        type: 'linear',        label: 'Comparison Value',        behavior: 'flex',        format: '0.2f'    },    marks: [        {            type: 'circle',            per: ['key'],            radius: 4,            attributes: {                'stroke-width': 0.5,                'fill-opacity': 0.8            },            tooltip:                'Subject ID: [key]\nBaseline: [shiftx]\nComparison: [shifty]\nChange: [chg]\nPercent Change: [pchg]'        }    ],    gridlines: 'xy',    resizable: false,    margin: { right: 25, top: 25 },    aspect: 1}
```