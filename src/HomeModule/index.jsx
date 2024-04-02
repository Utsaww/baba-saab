import React from 'react'
import MainSlider from './Component/MainSlider/MainSlider'
import ServiceHeading from './Component/ServiceHeading/ServiceHeading'
import AboutSection from './Component/AboutSection/AboutSection'
import ServiceSection from './Component/ServiceSection/ServiceSection'
import GallarySection from './Component/GallarySection/GallarySection'
import WhyUs from './Component/WhyUs/WhyUs'
import Testimonials from './Component/Testimonials/Testimonials'
import HomeContact from './Component/HomeContactSection/HomeContact'
import SocialMediaIcon from '@/CommonComponents/Footer/SocialMediaIcon/SocialMediaIcon'
import styles from "./home.module.scss";
import {
  BiLogoFacebook,
  BiLogoTwitter,
  BiLogoInstagram,
  BiLogoYoutube,
} from "react-icons/bi";





 
const HomePage = () => {

  const SocialMedia = [
    {
      id: 1,
      link: " https://www.facebook.com/babasaabevents/",
      icon: <BiLogoFacebook />,
    },
    {
      id: 2,
      link: "https://twitter.com/BabaEvent",
      icon: <BiLogoTwitter />,
    },
    {
      id: 3,
      link: "https://www.instagram.com/babasaabevents/",
      icon: <BiLogoInstagram />,
    },
    {
      id: 4,
      link: "https://www.youtube.com/channel/UCxal0pDnEpZ9Jb0uSwLlF7w",
      icon: <BiLogoYoutube />,
    },
  ];
  return (
    <>
      <MainSlider />
      <ServiceHeading />
      <AboutSection button={true} />
      <ServiceSection />
      <GallarySection />
      <WhyUs contactBtn={true} />
      <HomeContact />
      <SocialMediaIcon
        SocialMedia={SocialMedia}
        className={styles?.floatIcons}
      />
      <Testimonials />
    </>
  );
}

export default HomePage
