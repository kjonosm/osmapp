import { getApiId, getShortId, getUrlOsmId, OsmApiId, prod } from './helpers';
import { FetchError, fetchJson } from './fetch';
import { Feature, Position } from './types';
import { removeFetchCache } from './fetchCache';
import { overpassAroundToSkeletons } from './overpassAroundToSkeletons';
import { getPoiClass } from './getPoiClass';
import { isBrowser } from '../components/helpers';
import { addSchemaToFeature } from './tagging/idTaggingScheme';
import { fetchSchemaTranslations } from './tagging/translations';

const getOsmUrl = ({ type, id }) =>
  `https://api.openstreetmap.org/api/0.6/${type}/${id}.json`;
const getOsmHistoryUrl = ({ type, id }) =>
  `https://api.openstreetmap.org/api/0.6/${type}/${id}/history.json`;

// Overpass API is used only for getting cetroids of ways and relations
const getOverpassUrl = ({ type, id }) => {
  const queries = {
    way: (wId) => `[out:json][timeout:1];way(${wId});out 1 ids qt center;`,
    relation: (rId) => `[out:json][timeout:1];rel(${rId});out 1 ids qt center;`,
  };
  return `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
    queries[type](id),
  )}`;
};

const getOsmPromise = async (apiId) => {
  try {
    const { elements } = await fetchJson(getOsmUrl(apiId)); // TODO 504 gateway busy
    return elements?.[0];
  } catch (e) {
    if (e instanceof FetchError && e.code === '410') {
      const { elements } = await fetchJson(getOsmHistoryUrl(apiId));
      const length = elements?.length;

      if (length >= 2) {
        const lastWithTags = elements[length - 2];
        const last = elements[length - 1];
        return { ...lastWithTags, ...last, osmappDeletedMarker: true };
      }
    }
    throw e;
  }
};

/**
 * This holds coords of clicked ways/relations (from vector map), these are often different than those computed by us
 * TODO: we should probably store just the last one, but this cant get too big, right?
 */
const featureCenterCache = {};
export const addFeatureCenterToCache = (shortId, center) => {
  featureCenterCache[shortId] = center;
};

const getCenterPromise = async (apiId) => {
  if (apiId.type === 'node') return false;

  if (isBrowser() && featureCenterCache[getShortId(apiId)]) {
    return featureCenterCache[getShortId(apiId)];
  }

  try {
    const overpass = await fetchJson(getOverpassUrl(apiId));
    const { lat, lon } = overpass?.elements?.[0]?.center ?? {};
    return lon && lat ? [lon, lat] : false; // for some relations there are no coordinates
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('getCenterPromise()', e); // eg. 529 too many requests
    return false;
  }
};

export const clearFeatureCache = (apiId) => {
  removeFetchCache(getOsmUrl(apiId)); // watch out, must be same as in getOsmPromise()
  removeFetchCache(getOsmHistoryUrl(apiId));
};

const osmToFeature = (element): Feature => {
  const {
    tags = {},
    lat,
    lon,
    nodes,
    members,
    osmappDeletedMarker,
    ...osmMeta
  } = element;
  return {
    type: 'Feature' as const,
    geometry: undefined,
    center: lat ? [lon, lat] : undefined,
    osmMeta,
    tags,
    members,
    properties: getPoiClass(tags),
    deleted: osmappDeletedMarker,
  };
};

async function fetchFeatureWithCenter(apiId: OsmApiId) {
  const [element, center] = await Promise.all([
    getOsmPromise(apiId),
    getCenterPromise(apiId),
    fetchSchemaTranslations(), // TODO this should be mocked in test??? could be moved to setIntl or something
  ]);

  const feature = osmToFeature(element);
  if (center) {
    feature.center = center;
  }

  return addSchemaToFeature(feature);
}

const shouldFetchMembers = (feature: Feature) =>
  feature.osmMeta.type === 'relation' &&
  (feature.tags.climbing === 'crag' || feature.tags.climbing === 'area');

// TODO we can probably fetch full.json for all relations eg https://api.openstreetmap.org/api/0.6/relation/14334600/full.json - lets measure how long it takes for different sizes
export const addMemberFeatures = async (feature: Feature) => {
  if (!shouldFetchMembers(feature)) {
    return feature;
  }

  const start = performance.now();

  const apiIds = feature.members.map(({ type, ref }) => ({ type, id: ref }));
  const promises = apiIds.map((apiId) => fetchFeatureWithCenter(apiId)); // TODO optimize n+1 center-requests or fetch full
  const memberFeatures = await Promise.all(promises);
  memberFeatures.forEach((memberFeature, index) => {
    memberFeature.osmMeta.role = feature.members[index].role; // eslint-disable-line no-param-reassign
  });

  const duration = Math.round(performance.now() - start);
  console.log(`addMemberFeaturesToCrag took ${duration} ms`); // eslint-disable-line no-console

  return {
    ...feature,
    memberFeatures,
  };
};

export const fetchFeature = async (shortId): Promise<Feature> => {
  if (!shortId) {
    return null;
  }

  try {
    const apiId = getApiId(shortId);
    const withCenter = await fetchFeatureWithCenter(apiId);
    const withMembers = await addMemberFeatures(withCenter);

    return withMembers;
  } catch (e) {
    console.error(`fetchFeature(${shortId}):`, e); // eslint-disable-line no-console

    const error = (
      e instanceof FetchError ? e.code : 'unknown'
    ) as Feature['error'];

    return {
      type: 'Feature',
      skeleton: true,
      nonOsmObject: false,
      osmMeta: getApiId(shortId),
      center: undefined,
      tags: { name: getUrlOsmId(getApiId(shortId)) },
      properties: { class: '', subclass: '' },
      error,
    };
  }
};

export const insertOsmNote = async (point: Position, text: string) => {
  const [lon, lat] = point;

  const body = new URLSearchParams();
  body.append('lat', `${lat}`);
  body.append('lon', `${lon}`);
  body.append('text', text);

  const osmUrl = prod
    ? 'https://api.openstreetmap.org'
    : 'https://master.apis.dev.openstreetmap.org';

  // {"type":"Feature","geometry":{"type":"Point","coordinates":[14.3244982,50.0927863]},"properties":{"id":26569,"url":"https://master.apis.dev.openstreetmap.org/api/0.6/notes/26569.json","comment_url":"https://master.apis.dev.openstreetmap.org/api/0.6/notes/26569/comment.json","close_url":"https://master.apis.dev.openstreetmap.org/api/0.6/notes/26569/close.json","date_created":"2021-04-17 10:37:44 UTC","status":"open","comments":[{"date":"2021-04-17 10:37:44 UTC","action":"opened","text":"way/39695868! Place was marked permanently closed.From https://osmapp.org/way/39695868","html":"\u003cp\u003eway/39695868! Place was marked permanently closed.From \u003ca href=\"https://osmapp.org/way/39695868\" rel=\"nofollow noopener noreferrer\"\u003ehttps://osmapp.org/way/39695868\u003c/a\u003e\u003c/p\u003e"}]}}
  const reply = await fetchJson(`${osmUrl}/api/0.6/notes.json`, {
    nocache: true,
    method: 'POST',
    body,
  });

  const noteId = reply.properties.id;
  return {
    type: 'note',
    text,
    url: `${prod ? 'https://osm.org' : osmUrl}/note/${noteId}`,
  };
};

const getAroundUrl = ([lat, lon]: Position) =>
  `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
    `[timeout:5][out:json];(
        relation[~"."~"."](around:50,${lon},${lat});
        way[~"."~"."](around:50,${lon},${lat});
        node[~"."~"."](around:50,${lon},${lat});
      );out 20 body qt center;`, // some will be filtered out
  )}`;

export const fetchAroundFeature = async (point: Position) => {
  const response = await fetchJson(getAroundUrl(point));
  return overpassAroundToSkeletons(response);
};
