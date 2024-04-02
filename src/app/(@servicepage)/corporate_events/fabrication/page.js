import BreadCrumb from '@/CommonComponents/BreadCrumb';
import Fabrication from '@/Components/CorporateEvents/Fabrication'
import React from 'react'

const FabricationPage = () => {
  const BreadCrumbData = {
    link: "/corporate_events/fabrication",
    linkHeading: "Fabrication",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <Fabrication />
    </>
  );
}

export default FabricationPage
