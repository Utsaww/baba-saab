import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import Service from "@/ServiceModule/Components/WeddingService/Service";

import InstaGramSection from "../InstaGramSection/InstaGramSection";
import OtherLinksSection from "../OtherLinksSection/OtherLinksSection";

const EventPlanner = () => {
  const weddingServiceData = [
    {
      id: 1,
      cardNumber: "01",
      cardHeading: "Planning & execution",
      cardContent:
        "🎉 Planning & Execution: From concept to completion, we handle every detail of your event with precision and care. Our experienced team ensures seamless coordination and flawless execution, so you can relax and enjoy every moment.",
      backgroundImage: "",
      route: "/event_planning/planning_execution",
    },
    {
      id: 2,
      cardNumber: "02",
      cardHeading: "Venue",
      cardContent:
        "Our friendly and experienced team will work closely with you to find the perfect venue that suits your needs and preferences. Whether you're hosting a wedding, corporate event, or special celebration, we have a variety of stunning venues to choose from.",
      backgroundImage: "",
      route: "/event_planning/venue",
    },
    {
      id: 3,
      cardNumber: "03",
      cardHeading: "Hospitality Management",
      cardContent:
        "From intimate gatherings to grand celebrations, we handle every detail with care and expertise to ensure a memorable experience for you and your guests. Whether it's a wedding, corporate event, or social gathering, our dedicated team works tirelessly to bring your vision to life.",
      backgroundImage: "",
      route: "/event_planning/hospitality_management",
    },
    {
      id: 4,
      cardNumber: "04",
      cardHeading: "Event Budgeting",
      cardContent:
        "Our expert event planners are here to help you every step of the way, from conceptualizing your event to executing it within your budget. We'll work closely with you to understand your vision and priorities, then create a detailed plan that maximizes your resources without compromising on quality.",
      backgroundImage: "",
      route: "/event_planning/event_budgeting",
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
              <h1 className={styles?.weddingPlannerHeading}>Event Planning</h1>
              <p className={styles?.weddingText}>
                Get ready to turn your dreams into reality with our Event
                Planning Services! Whether it's a wedding, birthday party,
                corporate gathering, or any special occasion, we're here to make
                it unforgettable. From venue selection to decor, catering, and
                entertainment, we handle every detail so you can relax and enjoy
                the celebration. Let us bring your vision to life and create
                memories that last a lifetime with our friendly and professional
                event planning team!
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
        serviceName="Event Planning"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      />
    </>
  );
};

export default EventPlanner;
