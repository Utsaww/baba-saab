import BreadCrumb from '@/CommonComponents/BreadCrumb';
import CorporateEvents from '@/Components/CorporateEvents/CorporateEvents';
import React from 'react';

const CorporateEventspage = () => {
  const BreadCrumbData = {
    link: "/corporate_events",
    linkHeading: "Corporate Events",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <CorporateEvents />
    </>
  );
}

export default CorporateEventspage
