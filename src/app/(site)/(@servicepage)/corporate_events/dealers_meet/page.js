import BreadCrumb from '@/CommonComponents/BreadCrumb';
import DealersMeet from '@/Components/CorporateEvents/DealersMeet';
import React from 'react'

const DealersMeetPage = () => {
  const BreadCrumbData = {
    link: "/corporate_events/dealers_meet",
    linkHeading: "Dealers Meet",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <DealersMeet />
    </>
  );
}

export default DealersMeetPage
