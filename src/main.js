"use strict";

import * as d3 from "d3";

/**
 * @typedef {Object} CrimeData
 * @property {number} total_criminal_offences
 * @property {number} total_known_borough_criminal_offences
 * @property {Object.<string, DateCrimeData>} dates
 */

/**
 * @typedef {Object} DateCrimeData
 * @property {number} total_criminal_offences
 * @property {number} total_known_borough_criminal_offences
 * @property {Object.<string, BoroughCrimeData>} boroughs
 */

/**
 * @typedef {Object} BoroughCrimeData
 * @property {number} total_criminal_offences
 * @property {Object.<string, OffenceGroup>} offence_groups
 */

/**
 * @typedef {Object} OffenceGroup
 * @property {number} total_criminal_offences
 * @property {Object.<string, number>} offence_subgroups
 */

/**
 * @typedef {Object} OffenceInfo
 * @property {number} maxOffences
 * @property {string[]} offenceGroups
 */

const CITY_OF_LONDON_ID = "city-of-london";
const CAPITALIZE_EXCEPTIONS = [
    "a",
    "an",
    "and",
    "of",
    "in",
    "on",
    "for",
    "the",
    "to",
    "with",
];

async function main() {
    // Source: https://github.com/radoi90/housequest-data/blob/master/london_boroughs.geojson
    const geoJsonPromise = await d3.json("london-boroughs.geojson");
    /**
     * @type {CrimeData}
     */
    const crimeData = await d3.json("london-crime-data.json");

    drawMap(await geoJsonPromise);

    const offenceInfo = getOffenceInfo(crimeData);
    const scale = getScale(offenceInfo.maxOffences);
    const offencesUpperBound = roundUp(offenceInfo.maxOffences, scale);

    const pieColors = generatePieColors(offenceInfo.offenceGroups);

    setMapLegend(offencesUpperBound);

    const dates = Object.keys(crimeData.dates);

    updateData(crimeData, dates[0], offencesUpperBound);

    let selectedBorough = "";

    const timelineSliderElement = document.getElementById("timeline-slider");
    timelineSliderElement.max = dates.length - 1;

    let selectedOffenceGroup = "";
    const updateSelectedOffenceGroup = (offenceGroup) => {
        selectedOffenceGroup = offenceGroup;
        const date = dates[timelineSliderElement.value];
        const boroughData = crimeData.dates[date]
            .boroughs[selectedBorough]
            .offence_groups;
        d3.select("#borough-offence-group")
            .text(`${offenceGroup}: ${boroughData[offenceGroup].total_criminal_offences}`);
    };

    timelineSliderElement.oninput = (event) => {
        // noinspection JSUnresolvedReference
        const date = dates[event.target.value];
        updateData(crimeData, date, offencesUpperBound);
        if (selectedBorough !== "") {
            displayBoroughData(
                crimeData,
                selectedBorough,
                date,
                pieColors,
                updateSelectedOffenceGroup,
            );
        }
        if (selectedOffenceGroup !== "") {
            updateSelectedOffenceGroup(selectedOffenceGroup);
        }
    };

    let setPieLegend = false;
    d3.select("#map")
        .selectChildren()
        .on("click", function () {
            selectedBorough = this.id;
            const date = dates[timelineSliderElement.value];
            displayBoroughData(
                crimeData,
                selectedBorough,
                date,
                pieColors,
                updateSelectedOffenceGroup,
            );
            if (selectedOffenceGroup !== "") {
                updateSelectedOffenceGroup(selectedOffenceGroup);
            }
            if (!setPieLegend) {
                setOffenceGroupsLegend(pieColors);
                setPieLegend = true;
            }
        });
}

/**
 * @param geoJson {Object}
 */
function drawMap(geoJson) {
    const width = 500;
    const height = 250;

    // noinspection JSUnresolvedReference
    const projection = d3.geoIdentity().reflectY(true).fitSize([width, height], geoJson);
    // noinspection JSUnresolvedReference
    const path = d3.geoPath(projection);

    d3.select("#map")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "none")
        .selectAll("path")
        .data(geoJson.features)
        .join("path")
        .attr("id", d => nameToId(d.properties.name))
        .attr("class", "map-borough")
        .attr("d", path);
}

/**
 * @param name {string}
 * @returns {string}
 */
function nameToId(name) {
    return name.toLowerCase().replaceAll(" ", "-");
}

/**
 * @param crimeData {CrimeData}
 * @returns {OffenceInfo}
 */
function getOffenceInfo(crimeData) {
    let maxOffences = 0;
    const offenceGroups = new Set();
    for (const dateData of Object.values(crimeData.dates)) {
        for (const boroughData of Object.values(dateData.boroughs)) {
            maxOffences = Math.max(maxOffences, boroughData.total_criminal_offences);
            for (const offenceGroup of Object.keys(boroughData.offence_groups)) {
                offenceGroups.add(offenceGroup);
            }
        }
    }
    return {
        maxOffences,
        offenceGroups: Array.from(offenceGroups).sort(),
    };
}

/**
 * @param value {number}
 * @returns {number}
 */
function getScale(value) {
    const stringValue = value.toString();
    const power = stringValue.length - 1;
    return Math.pow(10, power);
}

/**
 * @param value {number}
 * @param scale {number}
 * @returns {number}
 */
function roundUp(value, scale) {
    return Math.ceil(value / scale) * scale;
}

/**
 * @param categories {string[]}
 * @returns {Object.<string, string>}
 */
function generatePieColors(categories) {
    const colorMapping = {};
    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        // Add 1 to the index to avoid the starting black color
        // noinspection JSUnresolvedReference
        colorMapping[category] = d3.interpolateTurbo((i + 1) / (categories.length + 1));
    }
    return colorMapping;
}

/**
 * @param offencesUpperBound {number}
 */
function setMapLegend(offencesUpperBound) {
    const minValue = 0;
    const maxValue = offencesUpperBound;

    const width = 55;
    const height = 200;

    const legendBarWidth = 20;
    const fontSize = 15;

    const margin = {
        top: 10,
        bottom: 10,
        left: 0,
        right: 35,
    };

    // noinspection JSUnresolvedReference
    const colorScale = d3.scaleSequential([minValue, maxValue], getMapColor);

    const svg = d3.select("#map-legend")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legend-gradient")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "100%")
        .attr("y2", "0%");

    linearGradient.selectAll("stop")
        .data(
            d3.range(0, 1.01, 0.01).map(t => ({
                offset: `${t * 100}%`,
                color: colorScale(minValue + t * (maxValue - minValue))
            }))
        )
        .enter()
        .append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    svg.append("rect")
        .attr("x", width - margin.right - legendBarWidth)
        .attr("y", margin.top)
        .attr("width", legendBarWidth)
        .attr("height", height - margin.top - margin.bottom)
        .style("fill", "url(#legend-gradient)");

    // noinspection JSUnresolvedReference
    const axisScale = d3.scaleLinear()
        .domain([minValue, maxValue])
        .range([height - margin.bottom, margin.top]);

    // noinspection JSUnresolvedReference
    const axis = d3.axisRight(axisScale)
        .ticks(5)
        .tickFormat(d3.format("~s"));

    svg.append("g")
        .attr("transform", `translate(${width - margin.right}, 0)`)
        .call(axis)
        .selectAll("text")
        .style("font-size", `${fontSize}px`);
}

/**
 * @param ratio {number}
 * @returns {string}
 */
function getMapColor(ratio) {
    const colorValue = Math.floor(255 * (1 - ratio));
    const colorHex = colorValue.toString(16).padStart(2, "0");
    return `#ff${colorHex}${colorHex}`;
}

/**
 * @param crimeData {CrimeData}
 * @param date {string}
 * @param offencesUpperBound {number}
 */
function updateData(
    crimeData,
    date,
    offencesUpperBound,
) {
    const dateObject = new Date(date);
    const month = dateObject.toLocaleString("default", {month: "long"});
    const year = dateObject.getFullYear();

    d3.select("#timeline-date")
        .text(`${month} ${year}`);
    d3.select("#total-offences")
        .text(`Total criminal offences in London in ${month} ${year}: ${crimeData.dates[date].total_criminal_offences}`);

    displayData(crimeData, date, offencesUpperBound);
}

/**
 * @param crimeData {CrimeData}
 * @param date {string}
 * @param offencesUpperBound {number}
 */
function displayData(
    crimeData,
    date,
    offencesUpperBound,
) {
    const boroughCrimes = crimeData.dates[date].boroughs;
    const paths = d3.select("#map")
        .selectChildren()
        .style("fill", function () {
            let boroughId = this.id;
            if (boroughId === CITY_OF_LONDON_ID) {
                boroughId = "southwark";
            }
            const boroughData = boroughCrimes[boroughId];
            if (boroughData === undefined) {
                console.error(`Borough data for ${boroughId} on ${date} not found`);
                return "#ffffff";
            }
            const ratio = boroughData.total_criminal_offences / offencesUpperBound;
            return getMapColor(ratio);
        });
    paths.selectChildren().remove();
    paths.append("title")
        .text(function (d) {
            let boroughId = this.parentNode.id;
            if (boroughId === CITY_OF_LONDON_ID) {
                boroughId = "southwark";
            }
            const boroughData = boroughCrimes[boroughId];
            if (boroughData === undefined) {
                console.error(`Borough data for ${boroughId} on ${date} not found`);
                return d.properties.name;
            }
            return `${d.properties.name}: ${boroughData.total_criminal_offences} criminal offences`;
        });
}

/**
 * @param crimeData {CrimeData}
 * @param boroughId {string}
 * @param date {string}
 * @param pieColors {Object.<string, string>}
 * @param updateSelectedOffenceGroup {function}
 */
function displayBoroughData(
    crimeData,
    boroughId,
    date,
    pieColors,
    updateSelectedOffenceGroup,
) {
    let fixedBoroughId = boroughId;
    if (fixedBoroughId === CITY_OF_LONDON_ID) {
        fixedBoroughId = "southwark";
    }
    const boroughData = crimeData.dates[date].boroughs[fixedBoroughId];
    if (boroughData === undefined) {
        console.error(`Borough data for ${boroughId} on ${date} not found`);
        return;
    }
    const offences = boroughData.total_criminal_offences;
    let boroughName;
    if (boroughId === CITY_OF_LONDON_ID || boroughId === "southwark") {
        boroughName = "the City of London and Southwark";
    } else {
        boroughName = boroughId.replaceAll("-", " ")
            .split(" ")
            .map(word => {
                if (CAPITALIZE_EXCEPTIONS.includes(word)) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(" ");
    }

    const dateObject = new Date(date);
    const month = dateObject.toLocaleString("default", {month: "long"});
    const year = dateObject.getFullYear();

    d3.select("#borough-offence-count")
        .text(`Criminal offences in ${boroughName} in ${month} ${year}: ${offences}`);

    displayCrimePieChart(
        crimeData,
        fixedBoroughId,
        date,
        pieColors,
        updateSelectedOffenceGroup,
    );
}

/**
 * @param crimeData {CrimeData}
 * @param boroughId {string}
 * @param date {string}
 * @param pieColors {Object.<string, string>}
 * @param updateSelectedOffenceGroup {function}
 */
function displayCrimePieChart(
    crimeData,
    boroughId,
    date,
    pieColors,
    updateSelectedOffenceGroup,
) {
    const boroughData = crimeData.dates[date]
        .boroughs[boroughId]
        .offence_groups;

    const processedBoroughData = Object.entries(boroughData)
        .map(([offenceGroup, offenceGroupData]) => {
            return {
                offence: offenceGroup,
                count: offenceGroupData.total_criminal_offences,
            };
        });

    const width = 200;
    const hoverSizeIncrease = 1.1;
    const radius = width / (2 * hoverSizeIncrease);
    const translate = width / 2;

    // noinspection JSUnresolvedReference
    const pie = d3.pie()
        .value(d => d.count)
        .sort((a, b) => d3.ascending(a.offence, b.offence));

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const hoverArc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius * hoverSizeIncrease);

    const svg = d3.select("#borough-crime-pie-chart")
        .attr("width", width)
        .attr("height", width);
    svg.selectChildren().remove();

    const svgContent = svg.append("g")
        .attr("id", "borough-crime-pie-chart-content")
        .attr("transform", `translate(${translate}, ${translate})`);

    svgContent.selectAll("path")
        .data(pie(processedBoroughData))
        .enter()
        .append("path")
        .attr("id", d => d.data.offence)
        .attr("class", "borough-info-pie-chart-sector")
        .attr("d", arc)
        .attr("fill", d => pieColors[d.data.offence])
        .attr("stroke", "black")
        .style("stroke-width", "1px")
        .on("mouseover", function () {
            const offenceGroupArc = d3.select(this);

            // noinspection JSUnresolvedReference
            offenceGroupArc.transition()
                .duration(100)
                .ease(d3.easeQuadOut)
                .attr("d", hoverArc);

            const offenceGroup = offenceGroupArc.attr("id");
            updateSelectedOffenceGroup(offenceGroup);
        })
        .on("mouseout", function () {
            // noinspection JSUnresolvedReference
            d3.select(this).transition()
                .duration(400)
                .ease(d3.easeBounceOut)
                .attr("d", arc);
        })
        .append("title")
        .text(d => `${d.data.offence}: ${d.data.count} occurrences`);
}

/**
 * @param pieColors {Object.<string, string>}
 */
function setOffenceGroupsLegend(pieColors) {
    for (const [offenceGroup, color] of Object.entries(pieColors)) {
        addLegendTier(color, offenceGroup, "offence-groups-legend");
    }
}

/**
 * @param color {string}
 * @param label {string}
 * @param legendId {string}
 */
function addLegendTier(color, label, legendId) {
    const legendSelection = d3.select(`#${legendId}`)
        .append("div")
        .attr("class", "legend-tier");
    legendSelection.append("div")
        .attr("class", "legend-tier-color")
        .style("background-color", color);
    legendSelection.append("p")
        .attr("class", "legend-tier-label")
        .text(label);
}

// noinspection JSIgnoredPromiseFromCall
main();
