import React from 'react';
import { FeaturedTags } from '../FeaturedTags';
import { IdSchemaFields } from './IdSchemaFields';
import { t } from '../../../services/intl';
import { TagsTableInner } from './TagsTableInner';
import { useFeatureContext } from '../../utils/FeatureContext';
import { Subheading } from '../helpers/Subheading';
import { Wrapper } from './Wrapper';
import { Table } from './Table';

export const Properties = ({ showTags }) => {
  const { feature } = useFeatureContext();

  return (
    <>
      {!showTags && (
        <>
          <FeaturedTags featuredTags={feature.schema?.featuredTags} />
          <IdSchemaFields />
        </>
      )}
      {showTags && (
        <>
          {!!Object.keys(feature.tags).length && (
            <Subheading>{t('featurepanel.all_tags_heading')}</Subheading>
          )}
          <Wrapper>
            <Table>
              <tbody>
                <TagsTableInner tags={feature.tags} center={feature.center} />
              </tbody>
            </Table>
          </Wrapper>
        </>
      )}
    </>
  );
};
