import BreadCrumb from '@/CommonComponents/BreadCrumb';
import ProductLaunch from '@/Components/CorporateEvents/ProductLaunch';
import React from 'react'

const ProductLaunchPage = () => {
  const BreadCrumbData = {
    link: "/corporate_events/product_launch",
    linkHeading: "Product Launch",
    mainHeading: "Some Information About Us",
  };
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />

      <ProductLaunch />
    </>
  );
}

export default ProductLaunchPage
