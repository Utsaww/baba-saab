import BreadCrumb from '@/CommonComponents/BreadCrumb';
import MainGallery from '@/GalleryModule/GalleryPage'
import React from 'react'

const GalleryPage = () => {
    const BreadCrumbData = {
      link: "/gallery",
      linkHeading: "Gallery",
      mainHeading: "Events Capture by Us",
    };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <MainGallery />
    </>
  );
}

export default GalleryPage
