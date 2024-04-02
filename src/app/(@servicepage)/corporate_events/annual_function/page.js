import BreadCrumb from '@/CommonComponents/BreadCrumb';
import AnnualFunction from '@/Components/CorporateEvents/AnnualFunction'
import React from 'react'

const AnnualFunctionPage = () => {
  const BreadCrumbData = {
    link: "/corporate_events/annual_function",
    linkHeading: "Annual Function",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <AnnualFunction />
    </>
  );
}

export default AnnualFunctionPage
