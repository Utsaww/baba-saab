import BreadCrumb from '@/CommonComponents/BreadCrumb';
import InternationalTour from '@/Components/CorporateEvents/InternationalTour'
import React from 'react'

const InternationalTourPage = () => {
  const BreadCrumbData = {
    link: "/corporate_events/international_tour",
    linkHeading: "International Tour",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <InternationalTour />
    </>
  );
}

export default InternationalTourPage
