import { useMapEffect } from '../../helpers';
import { basicStyle } from '../styles/basicStyle';
import { outdoorStyle } from '../styles/outdoorStyle';
import { osmappLayers } from '../../LayerSwitcher/osmappLayers';
import { rasterStyle } from '../styles/rasterStyle';
import { DEFAULT_MAP } from '../../../config';

export const getRasterLayer = (key) => {
  const url = osmappLayers[key]?.url ?? key; // if `key` not found, it contains tiles URL
  return rasterStyle(key, url);
};

export const useUpdateStyle = useMapEffect((map, activeLayers) => {
  const key = activeLayers[0] ?? DEFAULT_MAP;
  map.setStyle(
    key === 'basic'
      ? basicStyle
      : key === 'outdoor'
      ? outdoorStyle
      : getRasterLayer(key),
  );
});
