import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import Service from "@/ServiceModule/Components/WeddingService/Service";

import InstaGramSection from "../InstaGramSection/InstaGramSection";
import OtherLinksSection from "../OtherLinksSection/OtherLinksSection";

const CorporateEvents = () => {
  const weddingServiceData = [
    {
      id: 1,
      cardNumber: "01",
      cardHeading: "Product Launch",
      cardContent:
        "We specialize in creating unforgettable experiences that showcase your brand and captivate your audience. From venue selection to event planning and execution, our team handles every detail with precision and professionalism.",
      backgroundImage: "",
      route: "/corporate_events/product_lunch",
    },
    {
      id: 2,
      cardNumber: "02",
      cardHeading: "Dealers meet",
      cardContent:
        "We specialize in creating engaging and productive environments where dealers can connect, collaborate, and thrive. From venue selection to agenda planning and logistics, our team ensures that every aspect of your event is tailored to meet your goals and objectives.",
      backgroundImage: "",
      route: "/corporate_events/dealers_meet",
    },
    {
      id: 3,
      cardNumber: "03",
      cardHeading: "Annual Function",
      cardContent:
        "We specialize in creating vibrant and memorable events that celebrate your company's achievements and inspire your team. From venue selection to theme development and entertainment, our team works tirelessly to ensure that every aspect of your annual function reflects your company's values and culture.",
      backgroundImage: "",
      route: "/corporate_events/annual_function",
    },
    {
      id: 4,
      cardNumber: "04",
      cardHeading: "International tour planning",
      cardContent:
        "From arranging flights and accommodations to planning sightseeing tours and cultural experiences, our team handles every aspect of your international tour with meticulous attention to detail. With our expertise and dedication, you can relax and enjoy the journey, knowing that every detail is taken care of.",
      backgroundImage: "",
      route: "/corporate_events/international_tour",
    },
    {
      id: 5,
      cardNumber: "05",
      cardHeading: "Fabrication",
      cardContent:
        "With our attention to detail and commitment to excellence, you can trust us to deliver high-quality fabrication services that exceed your expectations. From concept to execution, we'll handle every aspect of the fabrication process, ensuring seamless coordination and timely delivery.",
      backgroundImage: "",
      route: "/corporate_events/fabrication",
    }
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
                Corporate Events
              </h1>
              <p className={styles?.weddingText}>
                Transform your corporate event into an unforgettable experience
                with our comprehensive services. From concept to execution, we
                specialize in crafting seamless and impactful events that leave
                a lasting impression. Whether it's a product launch, conference,
                gala dinner, or team-building retreat, our expert team handles
                every detail with precision and creativity. From venue selection
                to logistics management, entertainment, and branding, we ensure
                that your event reflects your company's values and goals. With
                our dedication to excellence and commitment to innovation, we'll
                help you create a corporate event that stands out and delivers
                results. Let us turn your vision into reality and elevate your
                next corporate gathering to new heights.
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
        serviceName="Corporate Events"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      />
    </>
  );
};

export default CorporateEvents;
