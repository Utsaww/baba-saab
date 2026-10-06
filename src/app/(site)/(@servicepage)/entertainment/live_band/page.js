import BreadCrumb from '@/CommonComponents/BreadCrumb';
import LiveBand from '@/Components/EntertainmentSection/LiveBand';
import React from 'react'

const LiveBandPage = () => {
  const BreadCrumbData = {
    link: "/entertainment/live_band",
    linkHeading: "Live Band",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <LiveBand />
    </>
  );
}

export default LiveBandPage
