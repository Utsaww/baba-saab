import React from "react";
import styles from "../WeddingPlanner/weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import OtherLinksSection from "@/Components/OtherLinksSection/OtherLinksSection";
import InstaGramSection from "@/Components/InstaGramSection/InstaGramSection";

const Fabrication = () => {
  const topService = [
    {
      id: 1,
      routeName: "Product Launch",
      routeLink: "/corporate_events/product_launch",
    },
    {
      id: 2,
      routeName: "Dealers meet",
      routeLink: "/corporate_events/dealers_meet",
    },
    {
      id: 3,
      routeName: "Annual Function",
      routeLink: "/corporate_events/annual_function",
    },
    {
      id: 4,
      routeName: "International tour planning",
      routeLink: "/corporate_events/international_tour",
    },
    {
      id: 5,
      routeName: "Fabrication",
      routeLink: "/corporate_events/fabrication",
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
                Building Brand Brilliance: Innovative Fabrication Solutions for
                Corporate Showcases
              </h1>
              <p className={styles?.weddingText}>
                Elevate your corporate events with Baba Saab Event's expert
                fabrication services in Ramanagar, Jim Corbett, Moradabad,
                Rampur, Amroha, Kashipur, Haldwani, Rudrapur, Bareilly,
                Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.
              </p>
              <p className={styles?.weddingText}>
                We specialize in creating stunning and customized fabrication
                solutions that bring your event vision to life. Whether you're
                hosting a conference, trade show, product launch, or any other
                corporate gathering, our team will work closely with you to
                design and build eye-catching displays, stages, backdrops, and
                more.
              </p>
              <p className={styles?.weddingText}>
                With our attention to detail and commitment to excellence, you
                can trust us to deliver high-quality fabrication services that
                exceed your expectations. From concept to execution, we'll
                handle every aspect of the fabrication process, ensuring
                seamless coordination and timely delivery.
              </p>
              <p className={styles?.weddingText}>
                Let Baba Saab Event enhance your corporate events with our
                top-notch fabrication services, creating impactful and memorable
                experiences for you and your guests. Whether you have a specific
                theme in mind or need guidance on design concepts, we're here to
                bring your ideas to life and make your event truly
                unforgettable.
              </p>
            </div>
            <div className={styles?.rightContent}>
              <OtherLinksSection topService={topService} />
              <InstaGramSection instaData={instaData} />
            </div>
          </div>
        </div>
      </section>
      {/* <Service
        ServiceData={weddingServiceData}
        serviceName="Wedding Service"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      /> */}
    </>
  );
};

export default Fabrication;
