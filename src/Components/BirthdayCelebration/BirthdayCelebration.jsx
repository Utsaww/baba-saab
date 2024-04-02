import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import Service from "@/ServiceModule/Components/WeddingService/Service";

import InstaGramSection from "../InstaGramSection/InstaGramSection";
import OtherLinksSection from "../OtherLinksSection/OtherLinksSection";

const BirthdayClebration = () => {
  const weddingServiceData = [
    {
      id: 1,
      cardNumber: "01",
      cardHeading: "Theme Decoration",
      cardContent:
        "Our expert team specializes in crafting personalized and enchanting themes that turn your celebration into a magical experience. Whether you dream of a fairy-tale setting, a superhero extravaganza, or a tropical paradise, we bring your vision to life with creativity and flair.",
      backgroundImage: "",
      route: "/birthday_celebration/theme_decoration",
    },
    {
      id: 2,
      cardNumber: "02",
      cardHeading: "Entertainments",
      cardContent:
        "Our dedicated team is here to sprinkle a dash of fun and excitement to your special day. From lively music to captivating performances and interactive activities, we curate entertainment experiences that cater to all ages and preferences. Whether you're hosting a kids' party, a milestone celebration, or an intimate gathering, we ensure that the entertainment resonates with the spirit of your celebration.",
      backgroundImage: "",
      route: "/birthday_celebration/entertainments",
    },
    {
      id: 3,
      cardNumber: "03",
      cardHeading: "Venue",
      cardContent:
        "From cozy spaces for intimate gatherings to grand halls for lavish parties, we ensure that the venue complements your vision and adds that extra touch of magic to your birthday celebration. Let us take the stress out of venue selection, allowing you to focus on creating beautiful memories with your loved ones.",
      backgroundImage: "",
      route: "/birthday_celebration/venue",
    },
    {
      id: 4,
      cardNumber: "04",
      cardHeading: "Activities",
      cardContent:
        "Our expert team is here to ensure that your celebration is filled with fun and memorable moments. From engaging games and thrilling activities to entertaining performances and interactive experiences, we offer a wide range of options to suit all ages and interests..",
      backgroundImage: "",
      route: "/birthday_celebration/activities",
    },
  ];
  const topService = [
    {
      id: 1,
      routeName: "Wedding Planning",
      routeLink: "/wedding_planner",
    },
    {
      id: 2,
      routeName: "Event Planning",
      routeLink: "/event_planning",
    },
    {
      id: 3,
      routeName: "Corporate Events",
      routeLink: "/corporate_events",
    },
    {
      id: 4,
      routeName: "Birthday celebration",
      routeLink: "/birthday_celebration",
    },
    {
      id: 5,
      routeName: "Celebrity Management",
      routeLink: "/celebrity_management",
    },
    {
      id: 6,
      routeName: "Entertainment",
      routeLink: "/entertainment",
    },
  ];
  const instaData = [
    {
      id: 1,
      name: insta,
      alt: "insta",
    },
    {
      id: 2,
      name: insta,
      alt: "insta",
    },
    {
      id: 3,
      name: insta,
      alt: "insta",
    },
    {
      id: 4,
      name: insta,
      alt: "insta",
    },
    {
      id: 5,
      name: insta,
      alt: "insta",
    },
    {
      id: 6,
      name: insta,
      alt: "insta",
    },
  ];
  return (
    <>
      <section className={styles?.weddingPlanner}>
        <div className={styles?.container}>
          <div className={styles?.weddingPlannerContent}>
            <div className={styles?.leftContent}>
              <div className={styles?.leftImageWrapper}>
                <Image src={wedding} alt="wedding" fill priority />
              </div>
              <h1 className={styles?.weddingPlannerHeading}>
                Birthday Celebration
              </h1>
              <p className={styles?.weddingText}>
                "Make every birthday unforgettable with our Birthday Celebration
                Services! From planning the perfect party to coordinating
                decorations, entertainment, and cake, we take care of every
                detail so you can focus on making memories with your loved ones.
                Whether it's a milestone birthday or a special occasion, let us
                help you create a day filled with joy, laughter, and cherished
                moments. With our friendly team by your side, your birthday
                celebration will be one to remember for years to come!"
              </p>
            </div>
            <div className={styles?.rightContent}>
              <OtherLinksSection topService={topService} />
              <InstaGramSection instaData={instaData} />
            </div>
          </div>
        </div>
      </section>
      <Service
        ServiceData={weddingServiceData}
        serviceName="Birthday Celebration"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      />
    </>
  );
};

export default BirthdayClebration;
