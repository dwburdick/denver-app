const SEARCH_RADIUS_MILES = 1.5;

const categoryData = {
  siteDevelopmentPlans: {
    label: "Site Development Plans",
    color: "#2f6ee4",
    items: [
      { name: "Broadway Mixed-Use SDP", details: "Approved 2025", lat: 39.7206, lng: -104.9873 },
      { name: "RiNo Yard Redevelopment SDP", details: "Under review", lat: 39.7594, lng: -104.9808 },
      { name: "Lowry East Parcel SDP", details: "Concept submitted", lat: 39.7145, lng: -104.8922 }
    ]
  },
  construction: {
    label: "Construction",
    color: "#f18f01",
    items: [
      { name: "Colfax Streetscape", details: "Roadway + ADA upgrades", lat: 39.7402, lng: -104.9563 },
      { name: "South Platte Greenway Improvements", details: "Trail enhancement", lat: 39.7526, lng: -105.006 },
      { name: "Auraria Utilities Relocation", details: "Underground utility work", lat: 39.7432, lng: -105.0068 }
    ]
  },
  rnos: {
    label: "RNOs",
    color: "#6a4c93",
    items: [
      { name: "Capitol Hill United Neighborhoods", details: "RNO #102", lat: 39.7318, lng: -104.9806 },
      { name: "Five Points Business District", details: "RNO #247", lat: 39.7598, lng: -104.9775 },
      { name: "West Highland Neighbors", details: "RNO #367", lat: 39.7647, lng: -105.045 }
    ]
  },
  groceryStores: {
    label: "Grocery Stores",
    color: "#1b9e77",
    items: [
      { name: "King Soopers - Speer", details: "1155 E 9th Ave", lat: 39.7316, lng: -104.9739 },
      { name: "Safeway - Corona", details: "560 N Corona St", lat: 39.7266, lng: -104.9747 },
      { name: "Natural Grocers - Colfax", details: "1433 N Washington St", lat: 39.7402, lng: -104.9781 }
    ]
  },
  transitStops: {
    label: "Transit Stops",
    color: "#e63946",
    items: [
      { name: "Union Station (RTD)", details: "Rail + bus hub", lat: 39.7527, lng: -105.0008 },
      { name: "16th & California", details: "Free MallRide stop", lat: 39.7448, lng: -104.9903 },
      { name: "Broadway & Alameda", details: "Frequent bus corridor", lat: 39.7101, lng: -104.987 }
    ]
  },
  libraries: {
    label: "Libraries",
    color: "#3a86ff",
    items: [
      { name: "Denver Central Library", details: "10 W 14th Ave Pkwy", lat: 39.7377, lng: -104.9882 },
      { name: "Ross-Cherry Creek Library", details: "305 Milwaukee St", lat: 39.7207, lng: -104.9539 },
      { name: "Eugene Field Branch", details: "810 S University Blvd", lat: 39.7026, lng: -104.9595 }
    ]
  },
  restaurants: {
    label: "Restaurants",
    color: "#ef476f",
    items: [
      { name: "Mercantile Dining & Provision", details: "1701 Wynkoop St", lat: 39.753, lng: -105.0005 },
      { name: "Potager", details: "1109 N Ogden St", lat: 39.7347, lng: -104.9745 },
      { name: "Cart-Driver RiNo", details: "2500 Larimer St", lat: 39.7581, lng: -104.9844 }
    ]
  }
};

const map = L.map("map").setView([39.7392, -104.9903], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

Object.values(categoryData).forEach((category) => {
  category.items.forEach((item) => {
    L.circleMarker([item.lat, item.lng], {
      radius: 5,
      color: category.color,
      fillColor: category.color,
      fillOpacity: 0.8,
      weight: 1
    })
      .bindPopup(`<strong>${item.name}</strong><br>${category.label}<br>${item.details}`)
      .addTo(map);
  });
});

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

  Object.values(categoryData).forEach((category) => {
    const nearby = category.items
      .map((item) => ({
        ...item,
        distance: distanceMiles(clickLat, clickLng, item.lat, item.lng)
      }))
      .filter((item) => item.distance <= SEARCH_RADIUS_MILES)
      .sort((a, b) => a.distance - b.distance);

    totalMatches += nearby.length;

    const section = document.createElement("section");
    section.className = "result-group";

    const heading = document.createElement("h3");
    heading.textContent = `${category.label} (${nearby.length})`;
    heading.style.color = category.color;
    section.appendChild(heading);

    if (nearby.length === 0) {
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
