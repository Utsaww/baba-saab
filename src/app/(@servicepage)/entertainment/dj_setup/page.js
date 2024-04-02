import BreadCrumb from '@/CommonComponents/BreadCrumb';
import DjSetup from '@/Components/EntertainmentSection/DjSetup'
import React from 'react'

const DjSetupPage = () => {
   const BreadCrumbData = {
     link: "/entertainment/dj_setup",
     linkHeading: "DJ Setup",
     mainHeading: "Some Information About Us",
   };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <DjSetup />
    </>
  );
}

export default DjSetupPage
