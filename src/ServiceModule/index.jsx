import BreadCrumb from '@/CommonComponents/BreadCrumb';
import React from 'react'
import Service from './Components/WeddingService/Service';
import styles from "./mainService.module.scss";


const ServiceSection = () => {
    const BreadCrumbData = {
      link: "/service",
      linkHeading: "Service",
      mainHeading: "Our Event Services",
    };
    // wedding Data
    const weddingServiceData = [
      {
        id: 1,
        cardNumber: "01",
        cardHeading: "Jaimala Theme",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 2,
        cardNumber: "02",
        cardHeading: "Wedding Venues",
        cardContent:
          "We provide many types of services like catering, wedding decoration, theme party decoration etc.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 3,
        cardNumber: "03",
        cardHeading: "Wedding Themes",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 4,
        cardNumber: "04",
        cardHeading: "Stage Decoration",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 5,
        cardNumber: "05",
        cardHeading: "Mehandi",
        cardContent:
          "We provide many types of services like catering, wedding decoration, theme party decoration etc",
        backgroundImage: "",
        route: "",
      },
      {
        id: 6,
        cardNumber: "06",
        cardHeading: "Wedding Band",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 7,
        cardNumber: "07",
        cardHeading: "Ladies Sangeet",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 8,
        cardNumber: "08",
        cardHeading: "Bride & Groom Entry",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 9,
        cardNumber: "09",
        cardHeading: "Wedding Choreography",
        cardContent:
          "We provide many types of services like catering, wedding decoration, theme party decoration etc.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 10,
        cardNumber: "10",
        cardHeading: "Makeup & Hairstyle",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 11,
        cardNumber: "11",
        cardHeading: "Flower Decoration",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 12,
        cardNumber: "12",
        cardHeading: "Wedding Photography",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
    ];
    const corporateEventData = [
      {
        id: 1,
        cardNumber: "01",
        cardHeading: "Product Launch",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 2,
        cardNumber: "02",
        cardHeading: "Gala Dinner",
        cardContent:
          "We provide many types of services like catering, wedding decoration, theme party decoration etc.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 3,
        cardNumber: "03",
        cardHeading: "Live Shows",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 4,
        cardNumber: "04",
        cardHeading: "Fashion",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 5,
        cardNumber: "05",
        cardHeading: "Dealers meet",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 6,
        cardNumber: "06",
        cardHeading: "Annual Function",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work",
        backgroundImage: "",
        route: "",
      }
    ];
    const destinationWeddingData = [
      {
        id: 1,
        cardNumber: "01",
        cardHeading: "Venue's",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 2,
        cardNumber: "02",
        cardHeading: "Logistics",
        cardContent:
          "We provide many types of services like catering, wedding decoration, theme party decoration etc.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 3,
        cardNumber: "03",
        cardHeading: "Catering",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 4,
        cardNumber: "04",
        cardHeading: "Wedding Dec.",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      }
    ];
    const weddingEventsData = [
      {
        id: 1,
        cardNumber: "01",
        cardHeading: "D.J. services",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 2,
        cardNumber: "02",
        cardHeading: "Barat Band",
        cardContent:
          "We provide many types of services like catering, wedding decoration, theme party decoration etc.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 3,
        cardNumber: "03",
        cardHeading: "Entertainment",
        cardContent:
          "We know that time is money so we provide every facility on time. There's no delay in our work.",
        backgroundImage: "",
        route: "",
      },
      {
        id: 4,
        cardNumber: "04",
        cardHeading: "Stage",
        cardContent:
          "We have more than 20 year's of experience in this field. So we plan everything kindly.",
        backgroundImage: "",
        route: "",
      },
    ];
  return (
    <>
      <BreadCrumb BreadCrumbData={BreadCrumbData} />
      <Service ServiceData={weddingServiceData} serviceName="Wedding Service" />
      <Service
        ServiceData={corporateEventData}
        serviceName="Corporate Event's"
      />
      <Service
        ServiceData={destinationWeddingData}
        serviceName="Destination Wedding"
      />
      <Service
        ServiceData={destinationWeddingData}
        serviceName="Wedding Events"
        className={styles?.rightService}
      />
    </>
  );
}

export default ServiceSection
