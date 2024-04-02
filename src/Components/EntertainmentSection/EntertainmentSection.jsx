import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import Service from "@/ServiceModule/Components/WeddingService/Service";

import InstaGramSection from "../InstaGramSection/InstaGramSection";
import OtherLinksSection from "../OtherLinksSection/OtherLinksSection";

const EntertainmentSection = () => {
  const weddingServiceData = [
    {
      id: 1,
      cardNumber: "01",
      cardHeading: "DJ setup",
      cardContent:
        "Get ready to turn your events into unforgettable celebrations with our top-notch DJ setup services! Whether you're in Ramanagar, Jim Corbett, Moradabad, Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly, Ghaziabad, Noida, Delhi, Nainital, or Bhimtal, we bring the perfect beats to elevate your party.",
      backgroundImage: "",
      route: "/entertainment/dj_setup",
    },
    {
      id: 2,
      cardNumber: "02",
      cardHeading: "Live Band",
      cardContent:
        "Immerse yourself in the soulful melodies and electrifying performances of our talented bands. Whether you're hosting a wedding, corporate event, or private party, our Live Bands will set the perfect tone and create an unforgettable atmosphere.",
      backgroundImage: "",
      route: "/entertainment/live_band",
    },
    {
      id: 3,
      cardNumber: "03",
      cardHeading: "Live music",
      cardContent:
        "Whether you're hosting a wedding, corporate event, or private party, our talented musicians will set the perfect tone for your occasion. From soulful ballads to upbeat tunes, our live music performances cater to all tastes and preferences.",
      backgroundImage: "",
      route: "/entertainment/live_music",
    },
    {
      id: 4,
      cardNumber: "04",
      cardHeading: "Dancers and Entertainers",
      cardContent:
        "Our talented performers bring the wow factor to any event, whether it's a wedding, corporate gathering, or private party. From graceful dancers to mesmerizing magicians, our entertainers are guaranteed to captivate your audience and leave them wanting more.",
      backgroundImage: "",
      route: "/entertainment/dancers_entertainers",
    },
    {
      id: 5,
      cardNumber: "05",
      cardHeading: "Celebrity performance",
      cardContent:
        "Imagine the thrill of watching your favorite celebrity perform live, right at your event. Whether it's a renowned singer, mesmerizing dancer, or hilarious comedian, their star power will dazzle your guests and create unforgettable memories.",
      backgroundImage: "",
      route: "/entertainment/celebrity_performance",
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
              <h1 className={styles?.weddingPlannerHeading}>Entertainment</h1>
              <p className={styles?.weddingText}>
                Step into a world of excitement and fun with our Entertainment
                Services! From lively music and captivating performances to
                interactive games and activities, we're here to make your event
                unforgettable. Whether it's a birthday party, corporate
                gathering, or wedding celebration, our friendly team ensures
                that everyone has a fantastic time. Let us bring the joy and
                laughter to your next event with our dynamic Entertainment
                Services!
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
        serviceName="Entertainment"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      />
    </>
  );
};

export default EntertainmentSection;
