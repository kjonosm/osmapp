import React, { useState } from 'react';
import styled from 'styled-components';
import { AppBar, Toolbar, Typography, IconButton } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import TuneIcon from '@material-ui/icons/Tune';
import { useClimbingContext } from './contexts/ClimbingContext';
import { ClimbingSettings } from './ClimbingSettings';
import { PhotoLink } from './PhotoLink';
import { useFeatureContext } from '../../utils/FeatureContext';
import { getLabel } from '../../../helpers/featureLabel';

const Title = styled.div`
  flex: 1;
  overflow: hidden;
`;
const PhotosContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 4px;
`;
const PhotosTitle = styled.div`
  color: ${({ theme }) => theme.textSubdued};
`;
const PhotoLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  gap: 4px;
  margin-bottom: 2px;
`;

export const ClimbingDialogHeader = ({ onClose }) => {
  const [isSettingsOpened, setIsSettingsOpened] = useState<boolean>(false);
  const [clickCounter, setClickCounter] = useState<number>(0);
  const {
    areRoutesVisible,
    setPhotoPath,
    photoPath,
    loadPhotoRelatedData,
    setAreRoutesLoading,
    photoPaths,
    setShowDebugMenu,
  } = useClimbingContext();

  const onPhotoChange = (photo: string) => {
    setAreRoutesLoading(true);
    setPhotoPath(photo);
    setTimeout(() => {
      // @TODO fix it without timeout
      loadPhotoRelatedData();
    }, 100);
  };
  const { feature } = useFeatureContext();

  const label = getLabel(feature);

  const handleOnClick = () => {
    setClickCounter(clickCounter + 1);
    if (clickCounter === 4) {
      setShowDebugMenu(true);
      setClickCounter(0);
    }
  };

  return (
    <AppBar position="static" color="transparent">
      <Toolbar variant="dense">
        <Title>
          <Typography
            noWrap
            variant="h6"
            component="div"
            onClick={handleOnClick}
          >
            {label}
          </Typography>
          {photoPaths?.length > 1 && (
            <PhotosContainer>
              <PhotosTitle>Photos:</PhotosTitle>
              <PhotoLinks>
                {photoPaths.map((photo, index) => (
                  <PhotoLink
                    onClick={() => onPhotoChange(photo)}
                    isCurrentPhoto={photo === photoPath}
                  >
                    {index}
                  </PhotoLink>
                ))}
              </PhotoLinks>
            </PhotosContainer>
          )}
        </Title>

        <IconButton
          color="primary"
          edge="end"
          title={areRoutesVisible ? 'Hide routes' : 'Show routes'}
          onClick={() => {
            setIsSettingsOpened(!isSettingsOpened);
          }}
        >
          <TuneIcon fontSize="small" />
        </IconButton>

        <IconButton color="primary" edge="end" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Toolbar>
      <ClimbingSettings
        isSettingsOpened={isSettingsOpened}
        setIsSettingsOpened={setIsSettingsOpened}
      />
    </AppBar>
  );
};
