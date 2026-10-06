import BreadCrumb from '@/CommonComponents/BreadCrumb';
import LiveMusic from '@/Components/EntertainmentSection/LiveMusic'
import React from 'react'

const LiveMusicPage = () => {
  const BreadCrumbData = {
    link: "/entertainment/live_music",
    linkHeading: "Live Music",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <LiveMusic />
    </>
  );
}

export default LiveMusicPage
