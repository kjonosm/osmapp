// @flow

import * as React from 'react';
import mapboxgl from 'mapbox-gl';

import mapboxStyle from './mapboxStyle';
import { getSkeleton, getOsmId } from './helpers';
import { getFeatureFromApi } from '../../services/osmApi';

const backgroundLayers = [
  // {
  //     "id": "simple-tiles",
  //     "type": "raster",
  //     "source": "osm_mapnik",
  //     "minzoom": 0,
  //     "maxzoom": 22
  // },
  {
    id: 'background',
    type: 'background',
    paint: {
      'background-color': '#f8f4f0',
    },
  },
];

const sources = {
  openmaptiles: {
    type: 'vector',
    url: 'https://maps.tilehosting.com/data/v3.json?key=7dlhLl3hiXQ1gsth0kGu', // https://cloud.maptiler.com/account
  },
  osm_mapnik: {
    type: 'raster',
    tiles: [
      'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
      'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ],
    tileSize: 256,
  },
};

const geolocateControl = new mapboxgl.GeolocateControl({
  positionOptions: {
    enableHighAccuracy: true,
  },
  trackUserLocation: true,
});

const scaleControl = new mapboxgl.ScaleControl({
  maxWidth: 80,
  unit: window.localStorage.getItem('units') ? 'imperial' : 'metric',
});

function addHoverPaint(origStyle) {
  const value = [
    'case',
    ['boolean', ['feature-state', 'hover'], false],
    0.5,
    1,
  ];
  origStyle.layers
    .filter(x => x.id.match(/^poi-/))
    .forEach(x => {
      if (x.paint) {
        x.paint['icon-opacity'] = value;
      }
    });
  return origStyle;
}

class BrowserMap extends React.Component {
  mapRef = React.createRef();
  map = null;
  lastHover = null;

  componentDidMount() {
    const origStyle = mapboxStyle(sources, backgroundLayers);
    const style = addHoverPaint(origStyle);
    this.map = new mapboxgl.Map({
      container: this.mapRef.current,
      style,
      center: [14.38906, 50.10062],
      zoom: 17,
      attributionControl: false,
    });

    this.map.addControl(geolocateControl);
    this.map.addControl(scaleControl);

    this.map.on('click', e => {
      const point = e.point;
      const coords = this.map.unproject(point).toArray();
      const features = this.map.queryRenderedFeatures(point);
      if (!features.length) {
        return;
      }

      const skeleton = getSkeleton(features[0]);
      console.log(`clicked skeleton: `, skeleton); // eslint-disable-line no-console

      if (skeleton.nonOsmSkeleton) {
        this.props.onFeatureClicked(skeleton);
      } else {
        this.props.onFeatureClicked({ ...skeleton, loading: true });
        this.fetchFromApi(skeleton.osmMeta);
      }
    });

    const setHover = (feature, hover) => {
      if (feature !== null) {
        this.map.setFeatureState(feature, { hover });
      }
    };

    const mousemove = e => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        if (feature !== this.lastHover) {
          setHover(this.lastHover, false);
          setHover(feature, true);
          this.lastHover = feature;
          this.map.getCanvas().style.cursor = 'pointer';
        }
      }
    };

    const mouseleave = () => {
      setHover(this.lastHover, false);
      this.lastHover = null;
      this.map.getCanvas().style.cursor = ''; // TODO delay 200ms
    };

    const backgroundIds = backgroundLayers.map(x => x.id);
    const hoverLayers = style.layers
      .map(x => x.id)
      .filter(x => !(x in backgroundIds));

    hoverLayers.forEach(x => {
      this.map.on('mousemove', x, mousemove);
      this.map.on('mouseleave', x, mouseleave);
    });
  }

  async fetchFromApi(osmApiId) {
    try {
      this.props.onFeatureClicked(await getFeatureFromApi(osmApiId));
    } catch (e) {
      console.warn(e);
    }
  }

  componentWillUnmount() {
    if (this.map) this.map.remove();
  }

  render() {
    return (
      <>
        <div ref={this.mapRef} style={{ height: '100%', width: '100%' }} />
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v0.52.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </>
    );
  }
}

export default BrowserMap;