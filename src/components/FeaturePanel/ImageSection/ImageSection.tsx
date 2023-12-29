import { IconButton } from '@mui/material';
import Share from '@mui/icons-material/Share';
import StarBorder from '@mui/icons-material/StarBorder';
import Directions from '@mui/icons-material/Directions';

import React from 'react';
import styled from 'styled-components';
import { useFeatureContext } from '../../utils/FeatureContext';
import { FeatureImage } from './FeatureImage';
import { t } from '../../../services/intl';
import { SHOW_PROTOTYPE_UI } from '../../../config';
import { PoiDescription } from './PoiDescription';

const StyledIconButton = styled(IconButton)`
  svg {
    width: 20px;
    height: 20px;
    color: #fff;
  }
`;

export const ImageSection = () => {
  const { feature } = useFeatureContext();
  const { properties } = feature;

  return (
    <FeatureImage feature={feature} ico={properties.class}>
      <PoiDescription />

      {SHOW_PROTOTYPE_UI && (
        <>
          <StyledIconButton>
            <Share
              htmlColor="#fff"
              titleAccess={t('featurepanel.share_button')}
            />
          </StyledIconButton>
          <StyledIconButton>
            <StarBorder
              htmlColor="#fff"
              titleAccess={t('featurepanel.save_button')}
            />
          </StyledIconButton>
          <StyledIconButton>
            <Directions
              htmlColor="#fff"
              titleAccess={t('featurepanel.directions_button')}
            />
          </StyledIconButton>
        </>
      )}
    </FeatureImage>
  );
};
