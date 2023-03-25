import { downloadFileName, button, toggleInitVis, addError, addProgress, checkPermissions } from "../common";
import { createCalendar, generateICal } from "../parser/parser";

console.info("Chrome main.js initialized");
checkPermissions();

if (button) {
  button.addEventListener("click", getData);
}

async function getData() {
  toggleInitVis();

  try {
    const [tab] = await chrome.tabs.query({
      currentWindow: true,
      active: true,
    });
    const tabID = tab.id;

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabID! },
      func: function () {
        return window.sessionStorage.getItem("myAdel");
      },
    });

    const { accessToken } = JSON.parse(results[0].result!);
    const token = accessToken.accessToken;
    const rawId = accessToken.claims.sub;
    const id = rawId.substring(1);

    const semCode = await getSemCode(id, token);
    const rawData = await getTimetable(id, token, semCode);

    const calendar = createCalendar("University", rawData);
    const iCal = generateICal(calendar);

    const downloadLink = document.createElement("a");
    downloadLink.href = iCal;
    downloadLink.download = downloadFileName;
    downloadLink.click();
    addProgress("Downloaded iCal file");
  } catch (error) {
    console.error(error);
  }
}

async function getSemCode(id: any, token: any) {
  try {
    const res = await fetch(
      `https://api.adelaide.edu.au/api/generic-query-structured/v1/?target=/system/TIMETABLE_WIDGET/queryx/${id}&MaxRows=5`,
      {
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers":
            "accept,authorization,access-control-allow-headers,access-control-allow-origin",
          "access-control-allow-methods": "GET,OPTIONS",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const resData = await res.json();
    return resData.data.query.rows[0]["A.STRM"];
  } catch (error) {
    console.error(error);
  }
}

async function getTimetable(id: any, token: any, semCode: any) {
  try {
    const res = await fetch(
      `https://api.adelaide.edu.au/api/generic-query-structured/v1/?target=/system/TIMETABLE_LIST/queryx/${id},${semCode}&MaxRows=9999`,
      {
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers":
            "accept,authorization,access-control-allow-headers,access-control-allow-origin",
          "access-control-allow-methods": "GET",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return await res.json();
  } catch (error) {
    console.error(error);
  }
}