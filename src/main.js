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

    const dates = Object.keys(crimeData.dates);
    const timelineDateElement = document.getElementById("timeline-date");

    updateData(crimeData, dates[0], timelineDateElement);

    const timelineSlider = document.getElementById("timeline-slider");
    timelineSlider.max = dates.length - 1;
    timelineSlider.value = 0;
    timelineSlider.oninput = () => {
        const date = dates[timelineSlider.value];
        updateData(crimeData, date, timelineDateElement);
    }
}

/**
 * @param crimeData {CrimeData}
 * @param date {string}
 * @param timelineDateElement {HTMLElement}
 */
function updateData(crimeData, date, timelineDateElement) {
    const dateObject = new Date(date);
    const month = dateObject.toLocaleString("default", {month: "long"});
    const year = dateObject.getFullYear();
    timelineDateElement.innerHTML = `${month} ${year}`;
    displayData(crimeData, date);
}

/**
 * @param crimeData {CrimeData}
 * @param date {string}
 */
function displayData(crimeData, date) {
    const boroughCrimes = crimeData.dates[date].boroughs
    const offencesUpperBound = 10000;
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
