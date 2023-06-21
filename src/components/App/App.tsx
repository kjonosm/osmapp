import React, { useEffect } from 'react';
import Cookies from 'js-cookie';

import nextCookies from 'next-cookies';
import Router, { useRouter } from 'next/router';
import FeaturePanel from '../FeaturePanel/FeaturePanel';
import Map from '../Map/Map';
import SearchBox from '../SearchBox/SearchBox';
import { Loading } from './Loading';
import { MapStateProvider, useMapStateContext } from '../utils/MapStateContext';
import { getInitialMapView, getInititalFeature } from './helpers';
import { HomepagePanel } from '../HomepagePanel/HomepagePanel';
// import { Loading } from './Loading';
import { FeatureProvider, useFeatureContext } from '../utils/FeatureContext';
import { OsmAuthProvider } from '../utils/OsmAuthContext';
import { FeaturePreview } from '../FeaturePreview/FeaturePreview';
import { TitleAndMetaTags } from '../../helpers/TitleAndMetaTags';
import { InstallDialog } from '../HomepagePanel/InstallDialog';
import { setIntlForSSR } from '../../services/intl';
import { useUserThemeContext } from '../../helpers/theme';

const usePersistMapView = () => {
  const { view } = useMapStateContext();
  React.useEffect(() => {
    if (typeof window !== 'undefined') window.location.hash = view.join('/');
    Cookies.set('mapView', view.join('/'), { expires: 7, path: '/' }); // TODO find optimal expiration
  }, [view]);
};

export const getMapViewFromHash = () => {
  const view = global.window?.location.hash
    .substr(1)
    .split('/')
    .map(parseFloat)
    .map((num) => num.toString());
  return view?.length === 3 ? view : undefined;
};

const useUpdateViewFromFeature = () => {
  const { feature } = useFeatureContext();
  const { setView } = useMapStateContext();

  React.useEffect(() => {
    if (feature?.center && !getMapViewFromHash()) {
      const [lon, lat] = feature.center.map((deg) => deg.toFixed(4));
      setView(['17.00', lat, lon]);
    }
  }, [feature]);
};

const useUpdateViewFromHash = () => {
  const { setView } = useMapStateContext();
  useEffect(() => {
    Router.beforePopState(() => {
      const mapViewFromHash = getMapViewFromHash();
      if (mapViewFromHash) {
        setView(mapViewFromHash);
      }
      return true; // let nextjs handle the route change as well
    });
  }, []);
};

const IndexWithProviders = () => {
  const { currentTheme } = useUserThemeContext();
  const { featureShown, preview } = useFeatureContext();
  const router = useRouter();
  useUpdateViewFromFeature();
  usePersistMapView();
  useUpdateViewFromHash();

  // TODO add correct error boundaries
  return (
    <div className={`${currentTheme}`}>
      {/* Left panel */}
      <div className="absolute flex flex-col w-full sm:w-[424px] p-2 gap-2 z-20 top-0 max-h-[90vh]">
        {/* <SearchBox /> */}
        <SearchBox />
      </div>

      {/* TODO these should all be children of the above "left panel" div once they are updated */}
      <Loading />
      {featureShown && <FeaturePanel />}
      {/* First load panel */}
      <HomepagePanel />

      {router.pathname === '/install' && <InstallDialog />}
      <Map />
      {preview && <FeaturePreview />}
      <TitleAndMetaTags />
    </div>
  );
};

const App = ({ featureFromRouter, initialMapView, hpCookie }) => {
  const mapView = getMapViewFromHash() || initialMapView;
  return (
    <FeatureProvider featureFromRouter={featureFromRouter} hpCookie={hpCookie}>
      <MapStateProvider initialMapView={mapView}>
        <OsmAuthProvider>
          <IndexWithProviders />
        </OsmAuthProvider>
      </MapStateProvider>
    </FeatureProvider>
  );
};
App.getInitialProps = async (ctx) => {
  await setIntlForSSR(ctx);

  const { hideHomepage: hpCookie } = nextCookies(ctx);
  const featureFromRouter = await getInititalFeature(ctx);
  const initialMapView = await getInitialMapView(ctx);
  return { featureFromRouter, initialMapView, hpCookie };
};

export default App;
