const SEARCH_RADIUS_MILES = 1.5;
const TRANSIT_RADIUS_MILES = 0.25;
const DENVER_CENTER = [39.7392, -104.9903];
const DENVER_BBOX = {
  south: 39.614,
  west: -105.109,
  north: 39.914,
  east: -104.599
};

const categories = {
  siteDevelopmentPlans: {
    label: "Site Development Plans",
    color: "#2f6ee4",
    sourceLabel: "City and County of Denver Open Data",
    radiusMiles: SEARCH_RADIUS_MILES,
    items: [],
    fallbackItems: [
      { name: "Broadway Mixed-Use SDP", details: "Sample fallback record", lat: 39.7206, lng: -104.9873 }
    ]
  },
  construction: {
    label: "Construction",
    color: "#f18f01",
    sourceLabel: "Local sample",
    radiusMiles: SEARCH_RADIUS_MILES,
    items: [
      { name: "Colfax Streetscape", details: "Roadway + ADA upgrades", lat: 39.7402, lng: -104.9563 },
      { name: "South Platte Greenway Improvements", details: "Trail enhancement", lat: 39.7526, lng: -105.006 },
      { name: "Auraria Utilities Relocation", details: "Underground utility work", lat: 39.7432, lng: -105.0068 }
    ]
  },
  rnos: {
    label: "RNOs",
    color: "#6a4c93",
    sourceLabel: "City and County of Denver Open Data",
    radiusMiles: SEARCH_RADIUS_MILES,
    items: [],
    fallbackItems: [
      { name: "Capitol Hill United Neighborhoods", details: "Sample fallback record", lat: 39.7318, lng: -104.9806 }
    ]
  },
  groceryStores: {
    label: "Grocery Stores",
    color: "#1b9e77",
    sourceLabel: "OpenStreetMap chain grocery features",
    radiusMiles: SEARCH_RADIUS_MILES,
    items: [],
    fallbackItems: [
      { name: "King Soopers", details: "Sample fallback record", lat: 39.7316, lng: -104.9739 }
    ]
  },
  transitStops: {
    label: "Transit Stops",
    color: "#e63946",
    sourceLabel: "OpenStreetMap transit features",
    radiusMiles: TRANSIT_RADIUS_MILES,
    items: [],
    fallbackItems: [
      { name: "Union Station", details: "Sample fallback record", lat: 39.7527, lng: -105.0008 }
    ]
  },
  libraries: {
    label: "Libraries",
    color: "#3a86ff",
    sourceLabel: "Local sample",
    radiusMiles: SEARCH_RADIUS_MILES,
    items: [
      { name: "Denver Central Library", details: "10 W 14th Ave Pkwy", lat: 39.7377, lng: -104.9882 },
      { name: "Ross-Cherry Creek Library", details: "305 Milwaukee St", lat: 39.7207, lng: -104.9539 },
      { name: "Eugene Field Branch", details: "810 S University Blvd", lat: 39.7026, lng: -104.9595 }
    ]
  }
};

const map = L.map("map").setView(DENVER_CENTER, 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);
let selectedMarker;
let radiusCircle;

map.on("click", (event) => {
  const { lat, lng } = event.latlng;
  if (selectedMarker) map.removeLayer(selectedMarker);
  if (radiusCircle) map.removeLayer(radiusCircle);

  selectedMarker = L.marker([lat, lng]).addTo(map).bindPopup("Selected location").openPopup();
  radiusCircle = L.circle([lat, lng], {
    radius: SEARCH_RADIUS_MILES * 1609.34,
    color: "#2f6ee4",
    fillColor: "#2f6ee4",
    fillOpacity: 0.08,
    weight: 2
  }).addTo(map);

  renderNearbyResults(lat, lng);
});

initData();

async function initData() {
  const loadingEl = document.getElementById("loading");
  loadingEl.textContent =
    "Loading live Site Development Plans, RNOs, grocery chains, and transit stops...";

  await Promise.all([loadSiteDevelopmentPlans(), loadRnos(), loadGroceryStores(), loadTransitStops()]);

  drawAllCategoryMarkers();
  loadingEl.textContent =
    "Loaded available live datasets (transit uses 0.25-mile radius; other categories use 1.5 miles).";
}

async function loadSiteDevelopmentPlans() {
  const layerUrls = [
    "https://www.denvergov.org/arcgis/rest/services/Planning/Site_Development_Plans/FeatureServer/0",
    "https://www.denvergov.org/arcgis/rest/services/Planning/Planning_OpenData/FeatureServer/0",
    "https://www.denvergov.org/arcgis/rest/services/Planning/Community_Planning_and_Development_Open_Data/FeatureServer/0"
  ];

  const features = await fetchFirstArcGisFeatures(layerUrls, "1=1");
  if (!features.length) {
    categories.siteDevelopmentPlans.items = [...categories.siteDevelopmentPlans.fallbackItems];
    return;
  }

  categories.siteDevelopmentPlans.items = features
    .map((feature) => {
      const geometry = feature.geometry || {};
      const lat = geometry.y;
      const lng = geometry.x;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const props = feature.attributes || {};
      const planName =
        props.PROJECTNAME || props.PROJECT_NAME || props.PLAN_NAME || props.NAME || "Site Development Plan";
      const status =
        props.STATUS || props.PLAN_STATUS || props.REVIEW_STATUS || props.APP_STATUS || "Status unavailable";
      const updated =
        props.LAST_EDITED_DATE || props.EDIT_DATE || props.MODIFIED_DATE || props.UPDATEDATE || props.DATEUPDATED;

      return {
        name: planName,
        details: `${status}${updated ? ` · Updated ${formatDate(updated)}` : ""}`,
        lat,
        lng
      };
    })
    .filter(Boolean);

  if (!categories.siteDevelopmentPlans.items.length) {
    categories.siteDevelopmentPlans.items = [...categories.siteDevelopmentPlans.fallbackItems];
  }
}

async function loadRnos() {
  const layerUrls = [
    "https://www.denvergov.org/arcgis/rest/services/Planning/Registered_Neighborhood_Organizations/FeatureServer/0",
    "https://www.denvergov.org/arcgis/rest/services/Planning/Planning_OpenData/FeatureServer/4",
    "https://www.denvergov.org/arcgis/rest/services/Planning/Community_Planning_and_Development_Open_Data/FeatureServer/4"
  ];

  const features = await fetchFirstArcGisFeatures(layerUrls, "1=1");
  if (!features.length) {
    categories.rnos.items = [...categories.rnos.fallbackItems];
    return;
  }

  categories.rnos.items = features
    .map((feature) => {
      const geometry = feature.geometry || {};
      const lat = geometry.y;
      const lng = geometry.x;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const props = feature.attributes || {};
      const name = props.RNO_NAME || props.ORGANIZATION || props.NAME || "Registered Neighborhood Organization";
      const number = props.RNO_NUMBER || props.RNO_NO || props.RNOID || props.OBJECTID;
      const website = props.WEBSITE || props.WEB_URL || props.URL || "";

      return {
        name,
        details: `${number ? `RNO #${number}` : "RNO"}${website ? ` · ${website}` : ""}`,
        lat,
        lng
      };
    })
    .filter(Boolean);

  if (!categories.rnos.items.length) {
    categories.rnos.items = [...categories.rnos.fallbackItems];
  }
}

async function loadGroceryStores() {
  const groceryQuery = `
[out:json][timeout:40];
(
  nwr["shop"="supermarket"]["brand"~"King Soopers|Safeway|Whole Foods|Sprouts|Natural Grocers", i](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
  nwr["shop"="supermarket"]["name"~"King Soopers|Safeway|Whole Foods|Sprouts|Natural Grocers", i](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
);
out center tags;
`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: groceryQuery
    });
    if (!response.ok) throw new Error(`Grocery request failed: ${response.status}`);

    const payload = await response.json();
    const deduped = dedupeByKey(
      (payload.elements || []).map((element) => {
        const tags = element.tags || {};
        const lat = element.lat ?? element.center?.lat;
        const lng = element.lon ?? element.center?.lon;

        return {
          key: `${tags.name || tags.brand || "grocery"}-${lat?.toFixed?.(6)}-${lng?.toFixed?.(6)}`,
          name: tags.name || tags.brand || "Grocery store",
          details: tags.brand || tags.operator || "Supermarket",
          lat,
          lng
        };
      })
    ).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    categories.groceryStores.items = deduped;

    if (!categories.groceryStores.items.length) {
      categories.groceryStores.items = [...categories.groceryStores.fallbackItems];
    }
  } catch (error) {
    console.error(error);
    categories.groceryStores.items = [...categories.groceryStores.fallbackItems];
  }
}

async function loadTransitStops() {
  const overpassQuery = `
[out:json][timeout:40];
(
  node["public_transport"="platform"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
  node["highway"="bus_stop"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
  node["railway"="station"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
  node["station"="light_rail"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
)->.stops;
rel(bn.stops)["type"="route"]["route"~"bus|train|light_rail|tram"]->.routes;
(.stops; .routes;);
out body;
`;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: overpassQuery
    });

    if (!response.ok) {
      throw new Error(`Transit request failed: ${response.status}`);
    }

    const payload = await response.json();
    const elements = payload.elements || [];
    const routeLinesByStopId = buildRouteLinesByStopId(elements);

    categories.transitStops.items = elements
      .filter((element) => element.type === "node")
      .map((element) => {
        const tags = element.tags || {};
        const transitType = classifyTransit(tags);
        const name = tags.name || tags.ref || "Transit stop";
        const directRouteRefs = normalizeRouteRefs(tags.route_ref || tags.routes || tags.lines || tags.ref);
        const relatedRouteRefs = routeLinesByStopId.get(element.id) || [];
        const lineRefs = dedupeStrings([...directRouteRefs, ...relatedRouteRefs]).slice(0, 12);

        return {
          name,
          details: `${transitType}${lineRefs.length ? ` · Lines: ${lineRefs.join(", ")}` : " · Lines: unavailable"}`,
          lat: element.lat,
          lng: element.lon
        };
      })
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    if (!categories.transitStops.items.length) {
      categories.transitStops.items = [...categories.transitStops.fallbackItems];
    }
  } catch (error) {
    console.error(error);
    categories.transitStops.items = [...categories.transitStops.fallbackItems];
  }
}

function buildRouteLinesByStopId(elements) {
  const routeLinesByStopId = new Map();
  const routeRelations = elements.filter((element) => element.type === "relation");

  routeRelations.forEach((relation) => {
    const tags = relation.tags || {};
    const relationLineName = tags.ref || tags.name || tags.route || "";
    if (!relationLineName) return;

    (relation.members || [])
      .filter((member) => member.type === "node")
      .forEach((member) => {
        if (!routeLinesByStopId.has(member.ref)) {
          routeLinesByStopId.set(member.ref, []);
        }
        routeLinesByStopId.get(member.ref).push(relationLineName);
      });
  });

  for (const [stopId, lines] of routeLinesByStopId.entries()) {
    routeLinesByStopId.set(stopId, dedupeStrings(lines));
  }

  return routeLinesByStopId;
}

function classifyTransit(tags) {
  if (tags.station === "light_rail") return "Light rail station";
  if (tags.railway === "station") return "Commuter/rail station";
  if (tags.highway === "bus_stop") return "Bus stop";
  return "Transit platform";
}

async function fetchFirstArcGisFeatures(layerUrls, where) {
  for (const layerUrl of layerUrls) {
    try {
      const features = await fetchArcGisAllFeatures(layerUrl, where);
      if (features.length) return features;
    } catch (error) {
      console.warn(`Failed to fetch ArcGIS layer ${layerUrl}`, error);
    }
  }
  return [];
}

async function fetchArcGisAllFeatures(layerUrl, where) {
  const allFeatures = [];
  let offset = 0;
  const pageSize = 2000;

  while (true) {
    const url = new URL(`${layerUrl}/query`);
    url.searchParams.set("where", where);
    url.searchParams.set("outFields", "*");
    url.searchParams.set("f", "json");
    url.searchParams.set("outSR", "4326");
    url.searchParams.set("returnGeometry", "true");
    url.searchParams.set("returnCentroid", "true");
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(pageSize));

    const response = await fetch(url);
    if (!response.ok) break;

    const payload = await response.json();
    if (!payload.features?.length) break;

    payload.features.forEach((feature) => {
      if (feature.geometry?.x != null && feature.geometry?.y != null) {
        allFeatures.push(feature);
      } else if (feature.centroid?.x != null && feature.centroid?.y != null) {
        allFeatures.push({ ...feature, geometry: { x: feature.centroid.x, y: feature.centroid.y } });
      }
    });

    if (!payload.exceededTransferLimit) break;
    offset += payload.features.length;
  }

  return allFeatures;
}

function normalizeRouteRefs(text) {
  if (!text || typeof text !== "string") return [];
  return dedupeStrings(
    text
      .split(/[;,/|]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

function dedupeStrings(values) {
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function dedupeByKey(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.key) return true;
    if (seen.has(item.key)) return false;
    seen.add(item.key);
    return true;
  });
}

function drawAllCategoryMarkers() {
  markerLayer.clearLayers();
  Object.values(categories).forEach((category) => {
    category.items.forEach((item) => {
      L.circleMarker([item.lat, item.lng], {
        radius: 5,
        color: category.color,
        fillColor: category.color,
        fillOpacity: 0.8,
        weight: 1
      })
        .bindPopup(`<strong>${item.name}</strong><br>${category.label}<br>${item.details}`)
        .addTo(markerLayer);
    });
  });
}

function distanceMiles(lat1, lon1, lat2, lon2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMiles * c;
}

function renderNearbyResults(clickLat, clickLng) {
  const resultsContainer = document.getElementById("results");
  const summaryEl = document.getElementById("summary");
  resultsContainer.innerHTML = "";

  let totalMatches = 0;

  Object.values(categories).forEach((category) => {
    const radiusMiles = category.radiusMiles ?? SEARCH_RADIUS_MILES;
    const nearby = category.items
      .map((item) => ({
        ...item,
        distance: distanceMiles(clickLat, clickLng, item.lat, item.lng)
      }))
      .filter((item) => item.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 25);

    totalMatches += nearby.length;

    const section = document.createElement("section");
    section.className = "result-group";

    const heading = document.createElement("h3");
    heading.textContent = `${category.label} (${nearby.length})`;
    heading.style.color = category.color;
    section.appendChild(heading);

    const source = document.createElement("p");
    source.className = "meta";
    source.textContent = `Source: ${category.sourceLabel} · Radius: ${radiusMiles} miles`;
    section.appendChild(source);

    if (!nearby.length) {
      const empty = document.createElement("p");
      empty.className = "meta";
      empty.textContent = `No locations found within ${radiusMiles} miles.`;
      section.appendChild(empty);
    } else {
      const list = document.createElement("ul");
      nearby.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${item.name}</strong> (${item.distance.toFixed(2)} mi)<br><span class="meta">${item.details}</span>`;
        list.appendChild(li);
      });
      section.appendChild(list);
    }

    resultsContainer.appendChild(section);
  });

  summaryEl.textContent = `Found ${totalMatches} places/projects within category-specific radii around (${clickLat.toFixed(
    5
  )}, ${clickLng.toFixed(5)}). Transit is limited to ${TRANSIT_RADIUS_MILES} miles; all other categories use ${SEARCH_RADIUS_MILES} miles.`;
}

function formatDate(raw) {
  const maybeMillis = Number(raw);
  const date = Number.isFinite(maybeMillis) ? new Date(maybeMillis) : new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}
