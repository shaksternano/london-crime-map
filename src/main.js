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

async function main() {
    /**
     * @type {CrimeData}
     */
    const crimeData = await fetch("./london-crime-data.json")
        .then(response => response.json());

    const maxOffences = getMaxOffences(crimeData);
    const scale = getScale(maxOffences);
    const offencesUpperBound = roundUp(maxOffences, scale);

    const dates = Object.keys(crimeData.dates);
    const timelineDateElement = document.getElementById("timeline-date");

    updateData(crimeData, dates[0], offencesUpperBound, timelineDateElement);

    const timelineSlider = document.getElementById("timeline-slider");
    timelineSlider.max = dates.length - 1;
    timelineSlider.value = 0;
    timelineSlider.oninput = () => {
        const date = dates[timelineSlider.value];
        updateData(crimeData, date, offencesUpperBound, timelineDateElement);
    }
}

/**
 * @param crimeData {CrimeData}
 * @returns {number}
 */
function getMaxOffences(crimeData) {
    let maxOffences = 0;
    for (const dateData of Object.values(crimeData.dates)) {
        for (const boroughData of Object.values(dateData.boroughs)) {
            maxOffences = Math.max(maxOffences, boroughData.total_criminal_offences);
        }
    }
    return maxOffences;
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
 * @param crimeData {CrimeData}
 * @param date {string}
 * @param offencesUpperBound {number}
 * @param timelineDateElement {HTMLElement}
 */
function updateData(
    crimeData,
    date,
    offencesUpperBound,
    timelineDateElement,
) {
    const dateObject = new Date(date);
    const month = dateObject.toLocaleString("default", {month: "long"});
    const year = dateObject.getFullYear();
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
        if (borough === "Unknown") {
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
        const colorValue = Math.floor(255 * (1 - ratio));
        const colorHex = colorValue.toString(16).padStart(2, "0");
        boroughElement.style.fill = `#ff${colorHex}${colorHex}`;
    }
}

// noinspection JSIgnoredPromiseFromCall
main();
