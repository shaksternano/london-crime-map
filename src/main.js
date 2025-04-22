"use strict";

import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

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
]

async function main() {
    const crimeDataResponse = await fetch("./london-crime-data.json");
    /**
     * @type {CrimeData}
     */
    const crimeData = await crimeDataResponse.json();

    const offenceInfo = getOffenceInfo(crimeData);
    const scale = getScale(offenceInfo.maxOffences);
    const offencesUpperBound = roundUp(offenceInfo.maxOffences, scale);

    const pieColors = generatePieColors(offenceInfo.offenceGroups);

    setLegend(offencesUpperBound);

    const dates = Object.keys(crimeData.dates);

    updateData(crimeData, dates[0], offencesUpperBound);

    let selectedBorough = "";

    const timelineSlider = document.getElementById("timeline-slider");
    timelineSlider.max = dates.length - 1;
    timelineSlider.value = 0;
    timelineSlider.oninput = (event) => {
        const date = dates[event.target.value];
        updateData(crimeData, date, offencesUpperBound);

        if (selectedBorough !== "") {
            displayBoroughData(crimeData, selectedBorough, date, pieColors);
        }
    }

    const mapElement = document.getElementById("map");
    for (const boroughElement of mapElement.children) {
        boroughElement.onclick = () => {
            const date = dates[timelineSlider.value];
            let boroughId = boroughElement.id;
            if (boroughId === "southwark-and-city-of-london") {
                boroughId = "southwark";
            }
            selectedBorough = boroughId;
            displayBoroughData(crimeData, boroughId, date, pieColors);
        }
    }
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
        offenceGroups: Array.from(offenceGroups),
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
    const colorMapping = {}
    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const hue = Math.floor((360 / categories.length) * i);
        colorMapping[category] = hslToHex(hue, 70, 50);
    }
    return colorMapping;
}

/**
 * @param hue {number}
 * @param saturation {number}
 * @param lightness {number}
 * @returns {string}
 */
function hslToHex(hue, saturation, lightness) {
    lightness /= 100;
    const a = saturation * Math.min(lightness, 1 - lightness) / 100;
    const f = (n) => {
        const k = (n + hue / 30) % 12;
        const color = lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * @param offencesUpperBound {number}
 */
function setLegend(offencesUpperBound) {
    const mapLegendElement = document.getElementById("map-legend");
    const legendTiers = 5;
    for (let i = legendTiers; i > 0; i--) {
        const ratio = i / legendTiers;
        const previousRatio = (i - 1) / legendTiers;
        const lowerBound = Math.round(offencesUpperBound * previousRatio);
        let upperBound = Math.round(offencesUpperBound * ratio);
        if (i !== legendTiers) {
            upperBound--;
        }
        const label = `${lowerBound} – ${upperBound}`;
        const color = getColor(ratio);

        const legendTierColorElement = document.createElement("div");
        legendTierColorElement.className = "map-legend-tier-color";
        legendTierColorElement.style.backgroundColor = color;

        const legendTierLabelElement = document.createElement("p");
        legendTierLabelElement.innerHTML = label.toString();
        legendTierLabelElement.className = "map-legend-tier-label";

        const legendTierElement = document.createElement("div");
        legendTierElement.className = "map-legend-tier";
        legendTierElement.appendChild(legendTierColorElement);
        legendTierElement.appendChild(legendTierLabelElement);

        mapLegendElement.appendChild(legendTierElement);
    }
}

/**
 * @param ratio {number}
 * @returns {string}
 */
function getColor(ratio) {
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
    const timelineDateElement = document.getElementById("timeline-date");
    timelineDateElement.innerHTML = `${month} ${year}`;
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
    const boroughCrimes = crimeData.dates[date].boroughs
    for (const [borough, boroughData] of Object.entries(boroughCrimes)) {
        if (borough === "unknown") {
            continue;
        }

        let boroughId = borough.replaceAll(" ", "-").toLowerCase();
        if (boroughId === "southwark") {
            boroughId = "southwark-and-city-of-london";
        }
        const boroughElement = document.getElementById(boroughId);
        if (boroughElement === null) {
            console.error(`Element with id ${boroughId} not found`);
            continue
        }

        const ratio = boroughData.total_criminal_offences / offencesUpperBound;
        boroughElement.style.fill = getColor(ratio);
    }
}

/**
 * @param crimeData {CrimeData}
 * @param boroughId {string}
 * @param date {string}
 * @param pieColors {Object.<string, string>}
 */
function displayBoroughData(
    crimeData,
    boroughId,
    date,
    pieColors,
) {
    const boroughData = crimeData.dates[date].boroughs[boroughId];
    if (boroughData === undefined) {
        console.error(`Borough data for ${boroughId} on ${date} not found`);
        return;
    }
    const offences = boroughData.total_criminal_offences;
    const boroughName = boroughId.replaceAll("-", " ")
        .split(" ")
        .map(word => {
            if (CAPITALIZE_EXCEPTIONS.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");

    const dateObject = new Date(date);
    const month = dateObject.toLocaleString("default", {month: "long"});
    const year = dateObject.getFullYear();

    const boroughOffenceCountElement = document.getElementById("borough-offence-count");
    boroughOffenceCountElement.innerHTML = `Criminal offences in ${boroughName} in ${month} ${year}: ${offences}`;

    const offenceGroupElement = document.getElementById("borough-offence-group");
    offenceGroupElement.textContent = "";

    displayCrimePieChart(crimeData, boroughId, date, pieColors);
}

/**
 * @param crimeData {CrimeData}
 * @param boroughId {string}
 * @param date {string}
 * @param pieColors {Object.<string, string>}
 */
function displayCrimePieChart(
    crimeData,
    boroughId,
    date,
    pieColors,
) {
    const boroughData = crimeData.dates[date]
        .boroughs[boroughId]
        .offence_groups;

    const processedBoroughData = Object.entries(boroughData)
        .map(([offenceGroup, offenceGroupData]) => {
            return {
                offence: offenceGroup,
                count: offenceGroupData.total_criminal_offences,
            }
        })

    const width = 200;
    const hoverSizeIncrease = 1.1;
    const radius = width / (2 * hoverSizeIncrease);
    const translate = width / 2;

    const svg = d3.select("#borough-crime-pie-chart")
        .attr("width", width)
        .attr("height", width)
        .append("g")
        .attr("transform", `translate(${translate}, ${translate})`);

    const pie = d3.pie()
        .value(d => d.count);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const hoverArc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius * hoverSizeIncrease)

    const offenceGroupElement = d3.select("#borough-offence-group")

    svg.selectAll("path")
        .data(pie(processedBoroughData))
        .enter()
        .append("path")
        .attr("id", d => d.data.offence)
        .attr("class", "borough-info-pie-chart-sector")
        .attr("d", arc)
        .attr("fill", d => pieColors[d.data.offence])
        .on("mouseover", function () {
            const offenceGroupArc = d3.select(this);

            offenceGroupArc.transition()
                .duration(100)
                .ease(d3.easeQuadOut)
                .attr("d", hoverArc);

            const offenceGroup = offenceGroupArc.attr("id");
            offenceGroupElement.text(`${offenceGroup}: ${boroughData[offenceGroup].total_criminal_offences}`);
        })
        .on("mouseout", function () {
            d3.select(this).transition()
                .duration(400)
                .ease(d3.easeBounceOut)
                .attr("d", arc);
        })
}

// noinspection JSIgnoredPromiseFromCall
main();
