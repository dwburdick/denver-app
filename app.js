const SEARCH_RADIUS_MILES = 1.5;
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
    items: [],
    fallbackItems: [
      { name: "Broadway Mixed-Use SDP", details: "Sample fallback record", lat: 39.7206, lng: -104.9873 }
    ]
  },
  construction: {
    label: "Construction",
    color: "#f18f01",
    sourceLabel: "Local sample",
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
    items: [],
    fallbackItems: [
      { name: "Capitol Hill United Neighborhoods", details: "Sample fallback record", lat: 39.7318, lng: -104.9806 }
    ]
  },
  groceryStores: {
    label: "Grocery Stores",
    color: "#1b9e77",
    sourceLabel: "Local sample",
    items: [
      { name: "King Soopers - Speer", details: "1155 E 9th Ave", lat: 39.7316, lng: -104.9739 },
      { name: "Safeway - Corona", details: "560 N Corona St", lat: 39.7266, lng: -104.9747 },
      { name: "Natural Grocers - Colfax", details: "1433 N Washington St", lat: 39.7402, lng: -104.9781 }
    ]
  },
  transitStops: {
    label: "Transit Stops",
    color: "#e63946",
    sourceLabel: "OpenStreetMap transit features",
    items: [],
    fallbackItems: [
      { name: "Union Station", details: "Sample fallback record", lat: 39.7527, lng: -105.0008 }
    ]
  },
  libraries: {
    label: "Libraries",
    color: "#3a86ff",
    sourceLabel: "Local sample",
    items: [
      { name: "Denver Central Library", details: "10 W 14th Ave Pkwy", lat: 39.7377, lng: -104.9882 },
      { name: "Ross-Cherry Creek Library", details: "305 Milwaukee St", lat: 39.7207, lng: -104.9539 },
      { name: "Eugene Field Branch", details: "810 S University Blvd", lat: 39.7026, lng: -104.9595 }
    ]
  },
  restaurants: {
    label: "Restaurants",
    color: "#ef476f",
    sourceLabel: "Local sample",
    items: [
      { name: "Mercantile Dining & Provision", details: "1701 Wynkoop St", lat: 39.753, lng: -105.0005 },
      { name: "Potager", details: "1109 N Ogden St", lat: 39.7347, lng: -104.9745 },
      { name: "Cart-Driver RiNo", details: "2500 Larimer St", lat: 39.7581, lng: -104.9844 }
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
  loadingEl.textContent = "Loading live Site Development Plans, RNOs, and transit stops...";

  await Promise.all([loadSiteDevelopmentPlans(), loadRnos(), loadTransitStops()]);

  drawAllCategoryMarkers();
  loadingEl.textContent = "Loaded available live datasets. Click the map to inspect nearby features.";
}

async function loadSiteDevelopmentPlans() {
  const candidates = [
    "https://www.denvergov.org/arcgis/rest/services/Planning/Site_Development_Plans/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson",
    "https://www.denvergov.org/arcgis/rest/services/Planning/Planning_OpenData/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson"
  ];

  const geojson = await fetchFirstJson(candidates);
  if (!geojson?.features?.length) {
    categories.siteDevelopmentPlans.items = [...categories.siteDevelopmentPlans.fallbackItems];
    return;
  }

  categories.siteDevelopmentPlans.items = geojson.features
    .map((feature) => {
      const [lng, lat] = feature.geometry?.coordinates ?? [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const props = feature.properties || {};
      const planName = props.projectname || props.plan_name || props.name || "Site Development Plan";
      const status = props.status || props.plan_status || props.review_status || "Status unavailable";
      const updated = props.last_edited_date || props.edit_date || props.modified_date;

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
  const candidates = [
    "https://www.denvergov.org/arcgis/rest/services/Planning/Registered_Neighborhood_Organizations/FeatureServer/0/query?where=1%3D1&outFields=*&returnCentroid=true&f=geojson",
    "https://www.denvergov.org/arcgis/rest/services/Planning/Planning_OpenData/FeatureServer/4/query?where=1%3D1&outFields=*&returnCentroid=true&f=geojson"
  ];

  const geojson = await fetchFirstJson(candidates);
  if (!geojson?.features?.length) {
    categories.rnos.items = [...categories.rnos.fallbackItems];
    return;
  }

  categories.rnos.items = geojson.features
    .map((feature) => {
      const props = feature.properties || {};
      const centroid = feature.properties?.centroid || feature.geometry?.coordinates;

      let lat;
      let lng;
      if (Array.isArray(centroid) && centroid.length >= 2) {
        [lng, lat] = centroid;
      } else if (feature.geometry?.type === "Point") {
        [lng, lat] = feature.geometry.coordinates;
      }

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
      }

      const name = props.rno_name || props.organization || props.name || "Registered Neighborhood Organization";
      const number = props.rno_number || props.rno_no || props.objectid;
      const website = props.website || props.web_url || "";

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

async function loadTransitStops() {
  const overpassQuery = `
[out:json][timeout:30];
(
  node["public_transport"="platform"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
  node["highway"="bus_stop"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
  node["railway"="station"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
  node["station"="light_rail"](${DENVER_BBOX.south},${DENVER_BBOX.west},${DENVER_BBOX.north},${DENVER_BBOX.east});
);
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
    categories.transitStops.items = (payload.elements || [])
      .map((element) => {
        const tags = element.tags || {};
        const transitType = classifyTransit(tags);
        const name = tags.name || tags.ref || "Transit stop";

        return {
          name,
          details: transitType,
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

function classifyTransit(tags) {
  if (tags.station === "light_rail") return "Light rail station";
  if (tags.railway === "station") return "Commuter/rail station";
  if (tags.highway === "bus_stop") return "Bus stop";
  return "Transit platform";
}

async function fetchFirstJson(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch ${url}`, error);
    }
  }

  return null;
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
    const nearby = category.items
      .map((item) => ({
        ...item,
        distance: distanceMiles(clickLat, clickLng, item.lat, item.lng)
      }))
      .filter((item) => item.distance <= SEARCH_RADIUS_MILES)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 20);

    totalMatches += nearby.length;

    const section = document.createElement("section");
    section.className = "result-group";

    const heading = document.createElement("h3");
    heading.textContent = `${category.label} (${nearby.length})`;
    heading.style.color = category.color;
    section.appendChild(heading);

    const source = document.createElement("p");
    source.className = "meta";
    source.textContent = `Source: ${category.sourceLabel}`;
    section.appendChild(source);

    if (!nearby.length) {
      const empty = document.createElement("p");
      empty.className = "meta";
      empty.textContent = "No locations found within 1.5 miles.";
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

  summaryEl.textContent = `Found ${totalMatches} places/projects within ${SEARCH_RADIUS_MILES} miles of (${clickLat.toFixed(
    5
  )}, ${clickLng.toFixed(5)}).`;
}

function formatDate(raw) {
  const maybeMillis = Number(raw);
  const date = Number.isFinite(maybeMillis) ? new Date(maybeMillis) : new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}
